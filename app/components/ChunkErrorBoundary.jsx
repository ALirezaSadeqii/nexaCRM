'use client'

import { Component } from 'react'

class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    // Check if it's a chunk loading error
    if (error?.name === 'ChunkLoadError' || error?.message?.includes('Loading chunk')) {
      return { hasError: true, error }
    }
    return null
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chunk loading error caught:', error, errorInfo)
    
    // Auto-reload after chunk error
    if (error?.name === 'ChunkLoadError' || error?.message?.includes('Loading chunk')) {
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading application...</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ChunkErrorBoundary