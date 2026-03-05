'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import './globals.css'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <html lang="en">
      <head>
        <title>Nudge — Automated Invoice Chasing</title>
        <meta name="description" content="Stop chasing invoices. Let Nudge do it." />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        <nav className="border-b border-gray-100 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
              Nudge
            </Link>
            <div className="flex items-center gap-6 text-sm">
              {loggedIn ? (
                <>
                  <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Start free trial
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
