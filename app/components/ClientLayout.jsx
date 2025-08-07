'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import supabase from '../config/supabaseClient'

// Dynamically import Sidebar to prevent chunk loading issues
const Sidebar = dynamic(() => import('./Sidebar'), {
  loading: () => (
    <div className="w-64 bg-white shadow-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
    </div>
  ),
  ssr: false
})

export default function ClientLayout({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let isActive = true

    // Get initial session with improved error handling
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        }
        if (isActive) {
          setSession(session)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in getSession:', error)
        if (isActive) {
          setLoading(false)
        }
      }
    }

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isActive && loading) {
        console.log('Session check timeout, proceeding without session')
        setLoading(false)
      }
    }, 3000) // Increased timeout to 3 seconds

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        if (isActive) {
          setSession(session)
          setLoading(false)
          
          // Handle auth state changes with small delay to prevent race conditions
          setTimeout(() => {
            if (event === 'SIGNED_IN' && pathname === '/') {
              router.push('/dashboard')
            } else if (event === 'SIGNED_OUT') {
              router.push('/')
            }
          }, 100)
        }
      }
    )

    return () => {
      isActive = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [pathname, router, mounted, loading])

  // Don't render anything until mounted (prevents hydration issues)
  if (!mounted) {
    return null
  }

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    )
  }

  // If on login page (now '/') or no session, render without sidebar
  if (pathname === '/' || !session) {
    return <div className="min-h-screen">{children}</div>
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