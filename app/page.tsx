import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      {/* Hero */}
      <section className="py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight">
          Stop chasing invoices.
          <br />
          <span className="text-gray-500">Let Nudge do it.</span>
        </h1>
        <p className="mt-6 text-xl text-gray-500 max-w-xl mx-auto">
          Nudge automatically follows up on unpaid invoices so you can focus on
          your work — not chasing clients for money.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="bg-gray-900 text-white px-6 py-3 rounded-md text-base font-medium hover:bg-gray-700 transition-colors"
          >
            Start free trial
          </Link>
          <span className="text-sm text-gray-400">No credit card required</span>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-gray-100">
        <h2 className="text-2xl font-semibold text-center text-gray-900 mb-16">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center mx-auto mb-4 text-lg">
              1
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Add your invoice</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Enter the client details, amount, and due date. Takes about 30 seconds.
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center mx-auto mb-4 text-lg">
              2
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nudge sends the emails</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Nudge sends polite, professional follow-ups on your behalf — automatically timed and escalating as needed.
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center mx-auto mb-4 text-lg">
              3
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">You get paid</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Mark the invoice as paid when the money lands. Nudge stops chasing. Simple.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 border-t border-gray-100">
        <h2 className="text-2xl font-semibold text-center text-gray-900 mb-12">
          Simple pricing
        </h2>
        <div className="max-w-sm mx-auto border border-gray-200 rounded-xl p-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">
              £15
              <span className="text-lg font-normal text-gray-400">/month</span>
            </div>
            <p className="mt-2 text-gray-500 text-sm">Cancel anytime. No lock-in.</p>
          </div>
          <ul className="mt-8 space-y-3 text-sm text-gray-600">
            {[
              'Unlimited invoices',
              'Automated follow-up emails',
              'Escalation sequences',
              'Paid / overdue tracking',
              '14-day free trial',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="text-green-500 font-bold">✓</span>
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="mt-8 block w-full bg-gray-900 text-white text-center py-3 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Start free trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-100 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Nudge. All rights reserved.
      </footer>
    </div>
  )
}
