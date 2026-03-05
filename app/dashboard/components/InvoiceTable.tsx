'use client'

export type InvoiceStatus = 'pending' | 'chasing' | 'paid' | 'escalated'

export interface Invoice {
  id: string
  client_name: string
  client_email: string
  invoice_number: string
  amount: number
  due_date: string
  status: InvoiceStatus
  created_at: string
}

interface InvoiceTableProps {
  invoices: Invoice[]
  onMarkPaid: (id: string) => void
  markingPaid: string | null
}

const statusConfig: Record<InvoiceStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-gray-100 text-gray-600' },
  chasing: { label: 'Chasing', classes: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Paid', classes: 'bg-green-100 text-green-700' },
  escalated: { label: 'Escalated', classes: 'bg-red-100 text-red-700' },
}

function daysOverdue(dueDateStr: string): number {
  const due = new Date(dueDateStr)
  const now = new Date()
  due.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function InvoiceTable({ invoices, onMarkPaid, markingPaid }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">
        No invoices yet. Add one to get started.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="pb-3 pr-4 font-medium text-gray-500">Client</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Invoice #</th>
            <th className="pb-3 pr-4 font-medium text-gray-500 text-right">Amount</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Due date</th>
            <th className="pb-3 pr-4 font-medium text-gray-500 text-right">Days overdue</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Status</th>
            <th className="pb-3 font-medium text-gray-500 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {invoices.map((inv) => {
            const overdue = daysOverdue(inv.due_date)
            const { label, classes } = statusConfig[inv.status] ?? statusConfig.pending

            return (
              <tr key={inv.id} className="group">
                <td className="py-4 pr-4">
                  <div className="font-medium text-gray-900">{inv.client_name}</div>
                  <div className="text-gray-400 text-xs">{inv.client_email}</div>
                </td>
                <td className="py-4 pr-4 text-gray-500">{inv.invoice_number}</td>
                <td className="py-4 pr-4 text-right font-medium text-gray-900">
                  {formatCurrency(inv.amount)}
                </td>
                <td className="py-4 pr-4 text-gray-500">{formatDate(inv.due_date)}</td>
                <td className="py-4 pr-4 text-right">
                  {overdue > 0 && inv.status !== 'paid' ? (
                    <span className="text-red-600 font-medium">{overdue}d</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-4 pr-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
                    {label}
                  </span>
                </td>
                <td className="py-4 text-right">
                  {inv.status !== 'paid' && (
                    <button
                      onClick={() => onMarkPaid(inv.id)}
                      disabled={markingPaid === inv.id}
                      className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                    >
                      {markingPaid === inv.id ? 'Saving…' : 'Mark paid'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
