import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nudge — Automated invoice chasing for freelancers',
  description: 'Stop chasing invoices. Nudge sends escalating follow-up emails automatically so you get paid without the awkward conversations.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 bg-white">
        <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="font-bold text-lg text-slate-900 tracking-tight">
              Nudge
              <span className="text-amber-500">.</span>
            </a>
            <div className="flex items-center gap-3">
              <a href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Log in
              </a>
              <a href="/signup" className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
                Start free trial
              </a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
