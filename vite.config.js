import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Mounts api/scan.js into the dev server so `npm run dev` behaves exactly like
// production — one handler, no Vercel CLI needed, and edits to the handler hot
// reload because it goes through Vite's module graph.
function devApi() {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/scan', async (req, res, next) => {
        if (req.method !== 'POST' && req.method !== 'GET') return next()
        try {
          const mod = await server.ssrLoadModule('/api/scan.js')
          await mod.default(req, res)
        } catch (err) {
          server.config.logger.error(`[dev-api] ${err.stack || err.message}`)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'The dev API handler crashed. Check the terminal.' }))
          }
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // The handler reads ANTHROPIC_API_KEY and MOCK_MODE off process.env. Vite only
  // exposes VITE_-prefixed vars to the client, so loading them here keeps the key
  // server-side while still making .env work in dev.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), devApi()],
    server: { port: 3000, host: true },
  }
})
