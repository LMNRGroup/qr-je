import type { Context } from 'hono'

import { getSupabaseAdminConfig, getSupabaseAuthConfig } from '../../config/supabase'
import type { AppBindings } from '../http/types'
import { QR_ASSETS_BUCKET, isAllowedAssetPath } from './url'

/**
 * Serving files through the backend keeps the `qr-assets` bucket private and
 * lets edge/browser caches absorb repeat traffic instead of every view being
 * a Supabase Storage egress hit.
 *
 * Files larger than SIGNED_URL_THRESHOLD_BYTES are redirected to a short-lived
 * signed URL instead of being streamed through the serverless function.
 */
const SIGNED_URL_THRESHOLD_BYTES = 4 * 1024 * 1024
const SIGNED_URL_TTL_SECONDS = 300

const EDGE_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable',
  'CDN-Cache-Control': 'public, max-age=31536000, immutable'
}

const getStorageConfig = () => {
  const { projectUrl } = getSupabaseAuthConfig()
  const { serviceRoleKey } = getSupabaseAdminConfig()
  return { projectUrl, serviceRoleKey }
}

const buildObjectUrl = (projectUrl: string, path: string) =>
  `${projectUrl}/storage/v1/object/${QR_ASSETS_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`

const buildSignedUrl = async (projectUrl: string, serviceRoleKey: string, path: string) => {
  const response = await fetch(
    `${projectUrl}/storage/v1/object/sign/${QR_ASSETS_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS })
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to create signed URL (${response.status})`)
  }

  const payload = (await response.json()) as { signedURL?: string; signedUrl?: string }
  const signedPath = payload.signedURL ?? payload.signedUrl
  if (!signedPath) {
    throw new Error('Signed URL response missing signedURL')
  }

  return signedPath.startsWith('http') ? signedPath : `${projectUrl}${signedPath}`
}

export const assetProxyHandler = () => {
  return async (c: Context<AppBindings>) => {
    const rawPath = c.req.path.replace(/^\/public\/assets\//, '')

    let path: string
    try {
      path = decodeURIComponent(rawPath)
    } catch {
      return c.json({ message: 'Invalid asset path' }, 400)
    }

    if (!isAllowedAssetPath(path)) {
      return c.json({ message: 'Asset not found' }, 404)
    }

    let projectUrl: string
    let serviceRoleKey: string
    try {
      ;({ projectUrl, serviceRoleKey } = getStorageConfig())
    } catch (error) {
      console.error('[assets] Supabase is not configured', error)
      return c.json({ message: 'Asset storage unavailable' }, 503)
    }

    const rangeHeader = c.req.header('range')

    let upstream: Response
    try {
      upstream = await fetch(buildObjectUrl(projectUrl, path), {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          ...(rangeHeader ? { range: rangeHeader } : {})
        }
      })
    } catch (error) {
      console.error(`[assets] Failed to fetch ${path}`, error)
      return c.json({ message: 'Asset storage unavailable' }, 502)
    }

    if (upstream.status === 404 || upstream.status === 400) {
      return c.json({ message: 'Asset not found' }, 404)
    }

    if (!upstream.ok) {
      console.error(`[assets] Upstream error for ${path}: ${upstream.status}`)
      return c.json({ message: 'Asset storage unavailable' }, 502)
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    const contentLength = Number(upstream.headers.get('content-length') ?? '0')

    // Range requests pass through without long-lived caching.
    if (rangeHeader) {
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-cache'
      }
      const contentRange = upstream.headers.get('content-range')
      if (contentRange) headers['Content-Range'] = contentRange
      if (contentLength > 0) headers['Content-Length'] = String(contentLength)
      return new Response(upstream.body, { status: upstream.status, headers })
    }

    // Large files: redirect to a short-lived signed URL instead of streaming
    // through the serverless function (response-size limits). The bucket stays
    // private; the URL expires quickly and the redirect itself is barely cached.
    if (contentLength > SIGNED_URL_THRESHOLD_BYTES) {
      try {
        const signedUrl = await buildSignedUrl(projectUrl, serviceRoleKey, path)
        return new Response(null, {
          status: 302,
          headers: {
            Location: signedUrl,
            'Cache-Control': 'public, max-age=60'
          }
        })
      } catch (error) {
        console.error(`[assets] Failed to sign ${path}`, error)
        return c.json({ message: 'Asset storage unavailable' }, 502)
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...EDGE_CACHE_HEADERS
    }
    if (contentLength > 0) {
      headers['Content-Length'] = String(contentLength)
    }

    return new Response(upstream.body, { status: 200, headers })
  }
}
