/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Photocopy grey — the colour every important document in a Nigerian
        // household actually is, after being copied a few times.
        paper: '#F4F5F2',
        sheet: '#FCFCFA',
        // Official ink. A real navy, not a tinted near-black.
        ink: '#14213A',
        muted: '#5C6478',
        rule: '#D9DBD4',
        // Stamp-pad violet. Used for exactly one thing: marking your
        // document's own words. Nothing else in the app is violet.
        stamp: '#4C2A85',
        flag: '#A8322D',
        money: '#1F5F4A',
      },
      fontFamily: {
        // The app's own voice.
        sans: ['"Hanken Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
        // Your document's voice. Tinos is metrically Times-compatible, so the
        // fallback on a slow connection looks near-identical.
        doc: ['Tinos', '"Times New Roman"', 'Georgia', 'serif'],
      },
      fontSize: {
        answer: ['1.75rem', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'answer-lg': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.022em' }],
      },
      maxWidth: {
        read: '34rem',
      },
      keyframes: {
        settle: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        sweep: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
      },
      animation: {
        settle: 'settle .45s cubic-bezier(.2,.7,.3,1) both',
        sweep: 'sweep 1.9s cubic-bezier(.4,0,.6,1) infinite',
      },
    },
  },
  plugins: [],
}
