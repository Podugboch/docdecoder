import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'

const STAGES = [
  'Reading your document',
  'Working out what it means for you',
  'Checking for anything that could cost you',
]

const DEEP_STAGES = [
  'Reading every clause',
  'Working out what you would be agreeing to',
  'Looking for anything that shifts risk onto you',
]

export default function Loading({ previewUrl, deep }) {
  const stages = deep ? DEEP_STAGES : STAGES
  const [stage, setStage] = useState(0)

  useEffect(() => {
    if (stage >= stages.length - 1) return
    const t = setTimeout(() => setStage((s) => s + 1), 2600)
    return () => clearTimeout(t)
  }, [stage, stages.length])

  return (
    <div className="animate-settle">
      <div
        className="relative mx-auto overflow-hidden rounded-md border border-rule bg-sheet"
        style={{ boxShadow: '0 10px 28px -16px rgba(20,33,58,.22)' }}
      >
        {previewUrl ? (
          // Showing their own photo back is the fastest way to confirm the right
          // page went up — and to let them cancel early if it didn't.
          <img
            src={previewUrl}
            alt="The document you sent"
            className="block max-h-[46vh] w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-muted">
            <FileText size={32} strokeWidth={1.5} />
          </div>
        )}

        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/4 animate-sweep"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(76,42,133,.14) 55%, rgba(76,42,133,.34))',
          }}
        />
      </div>

      <p aria-live="polite" className="mt-7 text-[1.0625rem] font-medium">
        {stages[stage]}…
      </p>
      <p className="mt-2 text-sm text-muted">This usually takes a few seconds.</p>
    </div>
  )
}
