import app from '../src/index'

const buildRequest = async (req: any) => {
  const url = new URL(req.url ?? '/', `http://${req.headers?.host ?? 'localhost'}`)
  const headers = new Headers()

  Object.entries(req.headers ?? {}).forEach(([key, value]) => {
    if (typeof value === 'string') {
      headers.set(key, value)
      return
    }
    if (Array.isArray(value)) {
      headers.set(key, value.join(','))
    }
  })

  const method = (req.method ?? 'GET').toUpperCase()
  let body: Buffer | undefined

  if (method !== 'GET' && method !== 'HEAD') {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    if (chunks.length > 0) {
      body = Buffer.concat(chunks)
    }
  }

  return new Request(url.toString(), {
    method,
    headers,
    body
  })
}

export default async function handler(req: any, res: any) {
  const request = await buildRequest(req)
  const response = await app.fetch(request)

  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  const buffer = Buffer.from(await response.arrayBuffer())
  res.end(buffer)
}
