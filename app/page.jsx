import Image from 'next/image'
import supabase from './config/supabaseClient'
export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your CRM overview</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-gray-500 text-sm">Total contacts</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Deals</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
          <p className="text-gray-500 text-sm">Active deals</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Companies</h3>
          <p className="text-3xl font-bold text-purple-600">0</p>
          <p className="text-gray-500 text-sm">Total companies</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Activities</h3>
          <p className="text-3xl font-bold text-orange-600">0</p>
          <p className="text-gray-500 text-sm">This month</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-500">No recent activity to display.</p>
      </div>
    </div>
  )
}
