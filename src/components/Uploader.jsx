import { useRef, useState } from 'react'
import { Camera, FileText } from 'lucide-react'
import { FREE_LIMIT } from '../lib/scanCount.js'

const CONTACT_URL = import.meta.env.VITE_CONTACT_URL

export default function Uploader({ onPick, scansLeft }) {
  const cameraRef = useRef(null)
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const exhausted = scansLeft <= 0

  function handleInput(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // so picking the same file twice still fires
    if (file) onPick(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (exhausted) return
    const file = e.dataTransfer.files?.[0]
    if (file) onPick(file)
  }

  if (exhausted) {
    return (
      <div className="animate-settle">
        <h1 className="text-answer font-semibold sm:text-answer-lg">
          You've used your {FREE_LIMIT} scans for this month.
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted">
          They reset at the start of next month. If you have something you need read
          before then, message me and I'll add more.
        </p>
        {CONTACT_URL && (
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-block rounded-md bg-ink px-5 py-3 font-medium text-paper transition hover:bg-ink/90"
          >
            Ask for more scans
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="animate-settle">
      <h1 className="text-answer font-semibold tracking-tight sm:text-answer-lg">
        What does this say?
      </h1>
      <p className="mt-3 max-w-read text-[1.0625rem] leading-relaxed text-muted">
        Photograph a bill, contract or letter. Get it back in plain words, with anything
        worth questioning pointed out.
      </p>

      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative mt-8 flex w-full flex-col items-center justify-center overflow-hidden rounded-md border bg-sheet px-6 py-14 transition active:translate-y-px ${
          dragging ? 'border-ink' : 'border-rule hover:border-muted'
        }`}
        style={{ boxShadow: '0 1px 0 rgba(20,33,58,.04), 0 10px 28px -14px rgba(20,33,58,.22)' }}
      >
        {/* A blank page waiting for content. Decoration, so hidden from readers. */}
        <span aria-hidden className="pointer-events-none absolute inset-x-7 top-7 space-y-2.5">
          {[100, 88, 94, 62].map((w, i) => (
            <span key={i} className="block h-[3px] rounded-full bg-ink/[0.07]" style={{ width: `${w}%` }} />
          ))}
        </span>

        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper">
          <Camera size={24} strokeWidth={1.75} />
        </span>
        <span className="mt-4 text-lg font-medium">Take a photo</span>

        <span aria-hidden className="pointer-events-none absolute inset-x-7 bottom-7 space-y-2.5">
          {[76, 96, 84].map((w, i) => (
            <span key={i} className="block h-[3px] rounded-full bg-ink/[0.07]" style={{ width: `${w}%` }} />
          ))}
        </span>
      </button>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mt-5 inline-flex items-center gap-2 rounded text-[0.9375rem] font-medium text-muted underline decoration-rule decoration-2 underline-offset-4 transition hover:text-ink hover:decoration-muted"
      >
        <FileText size={16} strokeWidth={1.75} />
        Or pick a file you already have
      </button>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInput}
        className="hidden"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleInput}
        className="hidden"
      />

      <hr className="mt-12 border-rule" />
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Read once, then thrown away. It isn't stored, and there's no account to create.
        <br />
        {scansLeft} of {FREE_LIMIT} scans left this month.
      </p>
    </div>
  )
}
