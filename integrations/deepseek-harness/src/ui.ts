import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'

const ROUTE = '/plugins/cmath-math-map'
const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url))
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, '../..')

const MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

function assetPath(pathname: string): string | undefined {
  const suffix = pathname.slice(ROUTE.length).replace(/^\/+/, '')
  const candidate = resolve(REPOSITORY_ROOT, suffix || 'index-v5.html')
  if (candidate !== REPOSITORY_ROOT && !candidate.startsWith(`${REPOSITORY_ROOT}${sep}`)) return
  if (!existsSync(candidate) || !statSync(candidate).isFile()) return
  return candidate
}

/** Host half of the UI plugin: expose the existing Math Map v5 application. */
export const inject = ['webServer']
export function apply(ctx: Context & { webServer: WebServer }): () => void {
  const disposeAssets = ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler(req, res) {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
      const file = assetPath(pathname)
      if (!file) {
        res.writeHead(404).end()
        return
      }
      res.writeHead(200, {
        'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      })
      if (req.method === 'HEAD') res.end()
      else createReadStream(file).pipe(res)
    },
  })
  // The unchanged v5 workbench probes its desktop key store on loopback. DSH
  // owns credentials instead, so answer with an empty store and keep secrets
  // out of the embedded application.
  const disposeLocalKey = ctx.webServer.register({
    kind: 'exact',
    path: '/api/local-key',
    handler(_req, res) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end('{"providers":{}}')
    },
  })
  return () => {
    disposeLocalKey()
    disposeAssets()
  }
}
