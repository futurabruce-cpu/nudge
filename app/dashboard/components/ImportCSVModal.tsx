'use client'

import { useState, useRef } from 'react'

interface ImportCSVModalProps {
  onClose: () => void
  onImported: () => void
  getAuthHeader: () => Promise<Record<string, string>>
}

const TEMPLATE_CSV = `client_name,client_email,invoice_number,amount,due_date,currency
Acme Ltd,billing@acme.com,INV-001,1500.00,2026-03-01,GBP
Globex Corp,accounts@globex.com,INV-002,800.00,2026-03-10,GBP`

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'nudge-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ImportCSVModal({ onClose, onImported, getAuthHeader }: ImportCSVModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    imported: number
    skipped: number
    errors: { row: number; reason: string }[]
  } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setResult(null)
      setError('')
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const authHeaders = await getAuthHeader()
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/invoices/import', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResult(data)
      if (data.imported > 0) onImported()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const done = result && !loading

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Import invoices from CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Template download */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Need a template?</p>
              <p className="text-xs text-gray-500 mt-0.5">Download a sample CSV to get started</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-white transition-colors"
            >
              Download
            </button>
          </div>

          {/* Required columns note */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Required columns:</p>
            <p className="text-xs text-gray-400 font-mono">
              client_name, client_email, invoice_number, amount, due_date
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Dates: YYYY-MM-DD or DD/MM/YYYY · Currency column optional (defaults to GBP)
            </p>
          </div>

          {/* File picker */}
          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-lg px-4 py-6 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors text-center"
            >
              {file ? (
                <span className="text-gray-800 font-medium">{file.name}</span>
              ) : (
                'Click to choose a CSV file'
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Results */}
          {done && (
            <div className="space-y-2">
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
                  <div className="text-xl font-semibold text-green-700">{result.imported}</div>
                  <div className="text-xs text-green-600">imported</div>
                </div>
                <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                  <div className="text-xl font-semibold text-amber-700">{result.skipped}</div>
                  <div className="text-xs text-amber-600">skipped</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg divide-y divide-red-100 max-h-32 overflow-y-auto">
                  {result.errors.map(e => (
                    <div key={e.row} className="px-3 py-1.5 text-xs text-red-700">
                      <span className="font-medium">Row {e.row}:</span> {e.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && (
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="flex-1 bg-gray-900 text-white py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Importing…' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
