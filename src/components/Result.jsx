import { ArrowLeft, ScanSearch } from 'lucide-react'

export default function Result({ result, model, onReset, onDeepRead, deepDone, scansLeft }) {
  if (!result.readable) {
    return (
      <div className="animate-settle">
        <BackLink onReset={onReset} label="Try another photo" />
        <h1 className="mt-6 text-answer font-semibold sm:text-answer-lg">
          The words aren't clear enough to read.
        </h1>
        <p className="mt-4 max-w-read text-[1.0625rem] leading-relaxed">
          {result.unreadable_reason ||
            'The document was too unclear to read. Try again with more light.'}
        </p>
        <p className="mt-6 max-w-read leading-relaxed text-muted">
          What usually helps: lay the page flat, get the whole page in frame, and let
          light fall on it from the side rather than straight on, so there's no glare.
        </p>
      </div>
    )
  }

  const meta = [result.issuer, result.period].filter(Boolean).join(', ')
  // Offering the close read with no scans left would promise something the cap
  // then refuses, so it only appears when there is one to spend.
  const showDeep = result.is_legal_agreement && !deepDone && scansLeft > 0

  let delay = 0
  const next = () => ({ animationDelay: `${(delay += 70)}ms` })

  return (
    <div>
      <BackLink onReset={onReset} label="Scan another document" />

      <header className="mt-6 animate-settle" style={next()}>
        <p className="font-medium text-muted">{result.doc_type}</p>
        {meta && <p className="mt-0.5 text-sm text-muted">{meta}</p>}
        <h1 className="mt-4 text-answer font-semibold tracking-tight sm:text-answer-lg">
          {result.answer}
        </h1>
      </header>

      {result.money?.length > 0 && (
        <Section title="Where your money goes" style={next()}>
          <dl className="space-y-3">
            {result.money.map((row, i) => (
              <div key={i} className="grid grid-cols-[6.5rem_1fr] gap-x-4 sm:grid-cols-[7.5rem_1fr]">
                <dt className="nums font-medium">{row.amount}</dt>
                <dd className="text-muted">{row.label}</dd>
              </div>
            ))}
            {result.total && (
              <div className="grid grid-cols-[6.5rem_1fr] gap-x-4 border-t border-rule pt-3 sm:grid-cols-[7.5rem_1fr]">
                <dt className="nums font-semibold">{result.total}</dt>
                <dd className="font-medium">Total</dd>
              </div>
            )}
          </dl>
        </Section>
      )}

      {result.flags?.length > 0 && (
        <Section title="Worth questioning" style={next()}>
          <div className="space-y-7">
            {result.flags.map((flag, i) => {
              const serious = flag.severity === 'serious'
              return (
                // The violet rule means one thing throughout: what follows is
                // copied from your document, so you can find it on your own paper.
                <div key={i} className="border-l-2 border-stamp pl-4 sm:pl-5">
                  <p
                    className={`font-doc text-[0.9375rem] leading-snug ${
                      serious ? 'text-ink/80' : 'text-muted'
                    }`}
                  >
                    {flag.quote}
                  </p>
                  <p
                    className={`mt-2.5 leading-relaxed ${
                      serious ? 'text-ink' : 'text-[0.9375rem] text-muted'
                    }`}
                  >
                    {flag.meaning}
                  </p>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {result.next_steps?.length > 0 && (
        <Section title="What to do next" style={next()}>
          <ol className="space-y-4">
            {result.next_steps.map((step, i) => (
              <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-x-3">
                <span className="nums pt-0.5 text-sm font-semibold text-muted">{i + 1}</span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {showDeep && (
        <div className="mt-10 animate-settle border-t border-rule pt-7" style={next()}>
          <p className="max-w-read leading-relaxed">
            This is an agreement, so the details matter more than usual.
          </p>
          <button
            type="button"
            onClick={onDeepRead}
            className="mt-4 inline-flex items-center gap-2.5 rounded-md border-2 border-ink px-5 py-3 font-medium transition hover:bg-ink hover:text-paper"
          >
            <ScanSearch size={18} strokeWidth={1.75} />
            Read the fine print closely
          </button>
          <p className="mt-3 text-sm text-muted">
            Slower and more careful, and it uses one of your scans. Worth it before you
            sign anything.
          </p>
        </div>
      )}

      <hr className="mt-12 border-rule" />
      <p className="mt-4 text-sm leading-relaxed text-muted">
        {deepDone && 'Read closely, clause by clause. '}
        This explains what the document says — it isn't legal advice. For anything with
        serious consequences, have a lawyer read it too.
        {model === 'mock' && (
          <span className="mt-2 block font-medium text-stamp">
            Sample result — MOCK_MODE is on, so nothing was sent anywhere.
          </span>
        )}
      </p>
    </div>
  )
}

function Section({ title, children, style }) {
  return (
    <section className="mt-10 animate-settle border-t border-rule pt-7" style={style}>
      <h2 className="mb-5 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function BackLink({ onReset, label }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center gap-1.5 rounded text-[0.9375rem] font-medium text-muted transition hover:text-ink"
    >
      <ArrowLeft size={16} strokeWidth={2} />
      {label}
    </button>
  )
}
