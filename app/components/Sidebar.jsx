'use client'
import supabase from '../config/supabaseClient'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  HomeIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  BuildingOfficeIcon, 
  CalendarIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Contacts', href: '/contacts', icon: UserGroupIcon },
  { name: 'Deals', href: '/deals', icon: CurrencyDollarIcon },
  { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
  { name: 'Activities', href: '/activities', icon: CalendarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

export default function Sidebar({ session, collapsed = false, onToggle }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error in logout:', error)
    }
  }

  // Get user info from session
  const userEmail = session?.user?.email || 'user@example.com'
  const userName = session?.user?.user_metadata?.full_name || 
                  session?.user?.user_metadata?.name || 
                  userEmail.split('@')[0] || 
                  'User'

  return (
    <div className={`flex h-full flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className="relative flex h-16 items-center border-b border-gray-800 px-3">
        <div className="flex-1 flex items-center justify-center">
          {collapsed ? (
            <div className="h-8 w-8 rounded-lg bg-gray-800 flex items-center justify-center text-white font-bold">N</div>
          ) : (
            <h1 className="text-xl font-bold text-white">NexaCRM</h1>
          )}
        </div>
        <button
          onClick={onToggle}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-gray-900 border border-gray-800 shadow-lg hover:bg-gray-800 text-gray-200 rounded-full p-1 transition-colors"
          aria-label="Toggle sidebar"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <item.icon
                className={`h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                } ${collapsed ? '' : 'mr-3'}`}
                aria-hidden="true"
              />
              {!collapsed && item.name}
            </Link>
          )
        })}
      </nav>
      
      {/* User section */}
      <div className="border-t border-gray-800 p-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-gray-400">{userEmail}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
