"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '../config/supabaseClient'
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const router = useRouter()
  const [metrics, setMetrics] = useState({
    contacts: 0,
    deals: 0,
    companies: 0,
    activities: 0
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [recentDeals, setRecentDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState({
    dealsByStatus: [],
    activitiesOverTime: [],
    revenueData: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Identify current user to properly scope queries
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const userId = userData?.user?.id

      // If no user, show empty state
      if (!userId) {
        setMetrics({ contacts: 0, deals: 0, companies: 0, activities: 0 })
        setRecentActivities([])
        setRecentDeals([])
        return
      }

      // Fetch counts, scoped to user
      const [contactsResult, dealsResult, companiesResult, activitiesResult] = await Promise.all([
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('activities').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      ])

      // Fetch recent activities with proper relationships
      const { data: activitiesData } = await supabase
        .from('activities')
        .select(`
          id,
          type,
          notes,
          contact_id,
          created_at,
          contacts(name, email, company_id, companies(name))
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Transform activities data
      const transformedActivities = (activitiesData || []).map(activity => ({
        ...activity,
        contact_name: activity.contacts?.name || "Unknown Contact",
        contact_company: activity.contacts?.companies?.name || null
      }))

      // Fetch recent deals with proper relationships
      const { data: dealsData } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          amount,
          status,
          contact_id,
          created_at,
          contacts(name, email, company_id, companies(name))
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Transform deals data
      const transformedDeals = (dealsData || []).map(deal => ({
        ...deal,
        contact_name: deal.contacts?.name || "Unknown Contact",
        contact_company: deal.contacts?.companies?.name || null
      }))

      // Fetch chart data - Deals by Status
      const { data: allDeals } = await supabase
        .from('deals')
        .select('status, amount')
        .eq('user_id', userId)

      // Calculate deals by status
      const statusCounts = {}
      const statusRevenue = {}
      ;(allDeals || []).forEach(deal => {
        const status = deal.status || 'unknown'
        statusCounts[status] = (statusCounts[status] || 0) + 1
        statusRevenue[status] = (statusRevenue[status] || 0) + (parseFloat(deal.amount) || 0)
      })

      const dealsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count,
        revenue: statusRevenue[status] || 0
      }))

      // Fetch activities over time (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: activitiesOverTime } = await supabase
        .from('activities')
        .select('created_at, type')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      // Group activities by date
      const activitiesByDate = {}
      ;(activitiesOverTime || []).forEach(activity => {
        const date = new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        activitiesByDate[date] = (activitiesByDate[date] || 0) + 1
      })

      const activitiesOverTimeData = Object.entries(activitiesByDate).map(([date, count]) => ({
        date,
        count
      }))

      // Revenue data (last 7 days)
      const { data: recentDealsForRevenue } = await supabase
        .from('deals')
        .select('created_at, amount, status')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      const revenueByDate = {}
      ;(recentDealsForRevenue || []).forEach(deal => {
        const date = new Date(deal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!revenueByDate[date]) revenueByDate[date] = 0
        revenueByDate[date] += parseFloat(deal.amount) || 0
      })

      const revenueData = Object.entries(revenueByDate).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue)
      }))

      setMetrics({
        contacts: contactsResult.count || 0,
        deals: dealsResult.count || 0,
        companies: companiesResult.count || 0,
        activities: activitiesResult.count || 0
      })
      
      setRecentActivities(transformedActivities)
      setRecentDeals(transformedDeals)
      setChartData({
        dealsByStatus,
        activitiesOverTime: activitiesOverTimeData,
        revenueData
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'call': return '📞'
      case 'email': return '📧'
      case 'meeting': return '🤝'
      case 'task': return '✅'
      default: return '📝'
    }
  }

  const getDealStatusColor = (status) => {
    switch (status) {
      case 'prospecting': return 'bg-gray-100 text-gray-700'
      case 'qualification': return 'bg-gray-200 text-gray-800'
      case 'proposal': return 'bg-gray-300 text-gray-900'
      case 'negotiation': return 'bg-slate-200 text-slate-800'
      case 'closed_won': return 'bg-gray-800 text-white'
      case 'closed_lost': return 'bg-gray-300 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Your CRM overview at a glance</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer" onClick={() => router.push('/contacts')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Contacts</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.contacts}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer" onClick={() => router.push('/deals')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Active Deals</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.deals}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer" onClick={() => router.push('/companies')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Companies</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.companies}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer" onClick={() => router.push('/activities')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Activities</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.activities}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <span className="text-xs text-gray-400">Navigate and create faster</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => router.push('/contacts')} className="flex items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300">
            <svg className="w-4 h-4 text-gray-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-gray-700 text-sm font-medium">Add Contact</span>
          </button>
          <button onClick={() => router.push('/deals')} className="flex items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300">
            <svg className="w-4 h-4 text-gray-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-gray-700 text-sm font-medium">New Deal</span>
          </button>
          <button onClick={() => router.push('/companies')} className="flex items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300">
            <svg className="w-4 h-4 text-gray-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-gray-700 text-sm font-medium">Add Company</span>
          </button>
          <button onClick={() => router.push('/activities')} className="flex items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300">
            <svg className="w-4 h-4 text-gray-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-gray-700 text-sm font-medium">Log Activity</span>
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Deals by Status Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-6">Deals by Status</h2>
          {chartData.dealsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData.dealsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                  outerRadius={80}
                  fill="#6b7280"
                  dataKey="value"
                >
                  {chartData.dealsByStatus.map((entry, index) => {
                    // Professional gray scale palette
                    const colors = ['#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6']
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="#fff" strokeWidth={2} />
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name, props) => [`${value} deals`, props.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              <p className="text-sm">No deals data available</p>
            </div>
          )}
        </div>

        {/* Activities Over Time */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-6">Activities (Last 7 Days)</h2>
          {chartData.activitiesOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.activitiesOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  stroke="#e5e7eb"
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  stroke="#e5e7eb"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  }}
                  cursor={{ fill: '#f3f4f6', opacity: 0.5 }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#4b5563" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              <p className="text-sm">No activities data available</p>
            </div>
          )}
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-6">Revenue (Last 7 Days)</h2>
          {chartData.revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData.revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  stroke="#e5e7eb"
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  stroke="#e5e7eb"
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                  cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#374151" 
                  strokeWidth={2.5}
                  dot={{ fill: '#374151', r: 3 }}
                  activeDot={{ r: 5, fill: '#374151' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              <p className="text-sm">No revenue data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Recent Activities</h2>
            <a href="/activities" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-xs font-medium transition-colors">
              View all
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="text-xl shrink-0">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.type || 'Activity'}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {activity.contact_name || 'No contact'}
                      {activity.contact_company && <span className="text-gray-400"> • {activity.contact_company}</span>}
                    </p>
                    {activity.notes && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{activity.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">{formatDate(activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-400">No recent activities</p>
            </div>
          )}
        </div>

        {/* Recent Deals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Recent Deals</h2>
            <a href="/deals" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-xs font-medium transition-colors">
              View all
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>
          {recentDeals.length > 0 ? (
            <div className="space-y-3">
              {recentDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{deal.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {deal.contact_name || 'No contact'}
                      {deal.contact_company && <span className="text-gray-400"> • {deal.contact_company}</span>}
                    </p>
                    {deal.amount && (
                      <p className="text-xs font-semibold text-gray-700 mt-1.5">${parseFloat(deal.amount).toLocaleString()}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">{formatDate(deal.created_at)}</p>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getDealStatusColor(deal.status)}`}>
                      {deal.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-400">No recent deals</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}