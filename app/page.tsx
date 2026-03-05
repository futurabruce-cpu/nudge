'use client'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          Now live — start chasing invoices today
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Stop chasing invoices.<br />
          <span className="text-amber-500">Let Nudge do it.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          Nudge automatically sends escalating follow-up emails to late-paying clients — polite at first, firm when needed. You focus on the work. We chase the money.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/signup" className="bg-slate-900 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-slate-700 transition-colors text-center">
            Start free trial
          </a>
          <a href="#how-it-works" className="border border-slate-200 text-slate-600 px-8 py-3.5 rounded-lg font-medium hover:bg-slate-50 transition-colors text-center">
            See how it works
          </a>
        </div>
        <p className="text-sm text-slate-400 mt-4">No credit card required · Cancel anytime</p>
      </section>

      {/* Social proof */}
      <section className="bg-slate-50 border-y border-slate-100 py-6 text-center">
        <p className="text-sm text-slate-500">
          Helping freelancers recover <span className="font-semibold text-slate-700">£2.4M+</span> in unpaid invoices
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-16">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Add an invoice', desc: 'Enter your client\'s details, the amount owed, and the due date. Takes 30 seconds.' },
            { step: '2', title: 'Nudge sends emails', desc: 'We send a polite reminder on day 3, a firm one on day 7, a final notice on day 14, and an accountant referral on day 30.' },
            { step: '3', title: 'You get paid', desc: 'Mark the invoice as paid with one click. No more awkward follow-up conversations.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 font-bold text-lg rounded-full flex items-center justify-center mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Email sequence preview */}
      <section className="bg-slate-50 border-y border-slate-100 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">The email sequence</h2>
          <p className="text-slate-500 text-center mb-12">Four carefully crafted emails that get results without burning bridges.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { day: 'Day 3', label: 'Polite nudge', color: 'border-slate-200 bg-white', badge: 'bg-slate-100 text-slate-600' },
              { day: 'Day 7', label: 'Firm reminder', color: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
              { day: 'Day 14', label: 'Final notice', color: 'border-orange-200 bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
              { day: 'Day 30', label: 'Accountant referral', color: 'border-red-200 bg-red-50', badge: 'bg-red-100 text-red-700' },
            ].map(({ day, label, color, badge }) => (
              <div key={day} className={`border rounded-xl p-5 ${color}`}>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge}`}>{day}</span>
                <p className="font-medium text-slate-900 mt-3 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-md mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple pricing</h2>
        <p className="text-slate-500 mb-10">One plan. Everything included.</p>
        <div className="border-2 border-slate-900 rounded-2xl p-8">
          <div className="text-4xl font-bold text-slate-900 mb-1">£15<span className="text-lg font-normal text-slate-400">/month</span></div>
          <p className="text-slate-500 text-sm mb-8">Cancel anytime</p>
          <ul className="text-sm text-slate-600 space-y-3 mb-8 text-left">
            {[
              'Unlimited invoices',
              'Automated 4-step email sequence',
              'One-click mark as paid',
              'Dashboard & reporting',
              'Email support',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <a href="/signup" className="block w-full bg-slate-900 text-white py-3.5 rounded-lg font-medium hover:bg-slate-700 transition-colors">
            Start free trial
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        <p>© {new Date().getFullYear()} Nudge. Built for freelancers who deserve to get paid.</p>
      </footer>
    </main>
  )
}
