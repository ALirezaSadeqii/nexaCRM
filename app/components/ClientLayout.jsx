'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import supabase from '../config/supabaseClient'

export default function ClientLayout({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    // Get initial session with timeout
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        }
        if (mounted) {
          setSession(session)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in getSession:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('Session check timeout, proceeding without session')
        setLoading(false)
      }
    }, 2000) // 2 second timeout

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        if (mounted) {
          setSession(session)
          setLoading(false)
          
          // Handle auth state changes
          if (event === 'SIGNED_IN' && pathname === '/') {
            router.push('/dashboard')
          } else if (event === 'SIGNED_OUT') {
            router.push('/')
          }
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [pathname, router])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // If on login page (now '/') or no session, render without sidebar
  if (pathname === '/' || !session) {
    return children
  }

  // If authenticated and not on login page, render with sidebar
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar session={session} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}