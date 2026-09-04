import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import Uploader from './components/Uploader.jsx'
import Loading from './components/Loading.jsx'
import Result from './components/Result.jsx'
import { prepareFile } from './lib/prepareFile.js'
import { scansLeft as readScansLeft, recordScan } from './lib/scanCount.js'

export default function App() {
  // idle → scanning → result | error
  const [stage, setStage] = useState('idle')
  const [doc, setDoc] = useState(null) // { data, mimeType, previewUrl }
  const [scan, setScan] = useState(null) // { result, model }
  const [error, setError] = useState(null) // { message, retry }
  const [deep, setDeep] = useState(false)
  const [left, setLeft] = useState(() => readScansLeft())

  // previewUrl is an object URL, so it is revoked by hand wherever a document is
  // replaced or cleared. Doing it in an effect would fire the cleanup during
  // StrictMode's double mount and blank the preview in development.

  async function send(prepared, isDeep) {
    setDeep(isDeep)
    setStage('scanning')
    setError(null)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: prepared.data, mimeType: prepared.mimeType, deep: isDeep }),
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setError({
          message: payload?.error || 'Something went wrong. Try again.',
          retry: payload?.retry ?? true,
        })
        setStage('error')
        return
      }

      // Only a scan that came back counts — and a close read counts too, because
      // it is a second, more expensive call.
      setLeft(recordScan())
      setScan({ result: payload.result, model: payload.model })
      setStage('result')
    } catch {
      setError({ message: 'No connection. Check your network and try again.', retry: true })
      setStage('error')
    }
  }

  async function handlePick(file) {
    setStage('scanning')
    setDeep(false)
    setError(null)

    let prepared
    try {
      prepared = await prepareFile(file)
    } catch {
      setError({ message: "That file couldn't be opened. Try a different photo.", retry: false })
      setStage('error')
      return
    }

    if (doc?.previewUrl) URL.revokeObjectURL(doc.previewUrl)
    setDoc(prepared)
    send(prepared, false)
  }

  function reset() {
    if (doc?.previewUrl) URL.revokeObjectURL(doc.previewUrl)
    setDoc(null)
    setScan(null)
    setError(null)
    setDeep(false)
    setStage('idle')
  }

  return (
    <main className="mx-auto w-full max-w-[32rem] px-5 py-12 sm:py-20">
      {stage === 'idle' && <Uploader onPick={handlePick} scansLeft={left} />}

      {stage === 'scanning' && <Loading previewUrl={doc?.previewUrl} deep={deep} />}

      {stage === 'result' && scan && (
        <Result
          result={scan.result}
          model={scan.model}
          deepDone={deep}
          scansLeft={left}
          onReset={reset}
          onDeepRead={() => doc && send(doc, true)}
        />
      )}

      {stage === 'error' && (
        <div className="animate-settle">
          <h1 className="text-answer font-semibold sm:text-answer-lg">That didn't go through.</h1>
          <p className="mt-4 max-w-read text-[1.0625rem] leading-relaxed">{error?.message}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            {error?.retry && doc && (
              <button
                type="button"
                onClick={() => send(doc, deep)}
                className="inline-flex items-center gap-2.5 rounded-md bg-ink px-5 py-3 font-medium text-paper transition hover:bg-ink/90"
              >
                <RotateCcw size={18} strokeWidth={1.75} />
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded text-[0.9375rem] font-medium text-muted underline decoration-rule decoration-2 underline-offset-4 transition hover:text-ink"
            >
              Try a different document
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
