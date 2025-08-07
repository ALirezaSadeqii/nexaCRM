import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from './components/ClientLayout'
import ChunkErrorBoundary from './components/ChunkErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'NexaCRM',
  description: 'Modern CRM application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ChunkErrorBoundary>
          <ClientLayout>{children}</ClientLayout>
        </ChunkErrorBoundary>
      </body>
    </html>
  )
}