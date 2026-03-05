'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function SettingsPage() {
  const router = useRouter()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push('/login')
      const token = data.session.access_token
      const res = await fetch('/api/webhooks/token', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setWebhookUrl(json.webhookUrl)
      }
      setLoading(false)
    })
  }, [])

  const copy = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
          ← Back to dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>

      {/* Webhook section */}
      <div className="border border-gray-100 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Webhook integration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Send invoices to Nudge automatically from Zapier, Make, or any tool that supports webhooks.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your webhook URL</p>
          {loading ? (
            <div className="h-9 bg-gray-200 animate-pulse rounded-md" />
          ) : (
            <div className="flex gap-2">
              <input
                readOnly
                value={webhookUrl}
                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-white font-mono truncate focus:outline-none"
              />
              <button
                onClick={copy}
                className="shrink-0 border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400">
            Keep this URL private — anyone with it can add invoices to your account.
          </p>
        </div>

        {/* Zapier instructions */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">How to set up with Zapier</p>
          <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
            <li>Create a new Zap in Zapier</li>
            <li>Set your trigger app (FreshBooks, Xero, Wave, QuickBooks, etc.)</li>
            <li>Choose trigger: <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">New Invoice Created</span></li>
            <li>Add an action: <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">Webhooks by Zapier → POST</span></li>
            <li>Paste your webhook URL above as the endpoint</li>
            <li>Map fields: <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">client_name, client_email, invoice_number, amount, due_date</span></li>
          </ol>
        </div>

        {/* Payload reference */}
        <div className="bg-gray-900 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-2 font-medium">Example payload</p>
          <pre className="text-xs text-green-400 leading-relaxed overflow-x-auto">{`{
  "client_name": "Acme Ltd",
  "client_email": "billing@acme.com",
  "invoice_number": "INV-042",
  "amount": 1500.00,
  "due_date": "2026-04-01",
  "currency": "GBP"
}`}</pre>
        </div>
      </div>
    </div>
  )
}
