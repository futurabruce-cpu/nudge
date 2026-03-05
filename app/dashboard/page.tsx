'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'
import InvoiceTable, { Invoice } from './components/InvoiceTable'
import AddInvoiceModal from './components/AddInvoiceModal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [hasSubscription, setHasSubscription] = useState(true) // optimistic: hide banner until we know
  const [subscribing, setSubscribing] = useState(false)

  const justSubscribed = searchParams.get('success') === 'true'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login')
      } else {
        fetchInvoices()
        checkSubscription(data.session.user.id)
      }
    })
  }, [])

  const checkSubscription = async (userId: string) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    setHasSubscription(!!data)
  }

  const handleSubscribe = async () => {
    setSubscribing(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create checkout session')
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      setError('Could not start checkout. Please try again.')
      setSubscribing(false)
    }
  }

  const getAuthHeader = async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession()
    return data.session ? { 'Authorization': `Bearer ${data.session.access_token}` } : {}
  }

  const fetchInvoices = async () => {
    setLoading(true)
    setError('')
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/invoices', { headers })
      if (!res.ok) throw new Error('Failed to load invoices')
      const data = await res.json()
      setInvoices(data.invoices ?? [])
    } catch {
      setError('Could not load invoices.')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPaid = async (id: string) => {
    setMarkingPaid(id)
    try {
      const authHeaders = await getAuthHeader()
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ status: 'paid' }),
      })
      if (!res.ok) throw new Error()
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status: 'paid' } : inv))
      )
    } catch {
      setError('Could not mark invoice as paid.')
    } finally {
      setMarkingPaid(null)
    }
  }

  const stats = {
    total: invoices.length,
    outstanding: invoices.filter((i) => i.status !== 'paid').length,
    overdue: invoices.filter((i) => {
      if (i.status === 'paid') return false
      return new Date(i.due_date) < new Date()
    }).length,
    totalOwed: invoices
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + i.amount, 0),
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Add invoice
        </button>
      </div>

      {/* Subscription banner */}
      {justSubscribed && (
        <div className="mb-6 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
          🎉 Subscription activated — welcome to Nudge Pro!
        </div>
      )}
      {!hasSubscription && !justSubscribed && (
        <div className="mb-6 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
          <p className="text-sm text-amber-800">
            You're on the free plan. Upgrade to unlock unlimited invoices and reminders.
          </p>
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="ml-4 shrink-0 bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {subscribing ? 'Redirecting…' : 'Subscribe'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total invoices', value: stats.total },
          { label: 'Outstanding', value: stats.outstanding },
          { label: 'Overdue', value: stats.overdue },
          {
            label: 'Total owed',
            value: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(stats.totalOwed),
          },
        ].map(({ label, value }) => (
          <div key={label} className="border border-gray-100 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-xl font-semibold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-100 rounded-xl p-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : (
          <InvoiceTable
            invoices={invoices}
            onMarkPaid={handleMarkPaid}
            markingPaid={markingPaid}
          />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddInvoiceModal
          onClose={() => setShowModal(false)}
          onAdded={fetchInvoices}
        />
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading…</div>}>
      <DashboardContent />
    </Suspense>
  )
}
