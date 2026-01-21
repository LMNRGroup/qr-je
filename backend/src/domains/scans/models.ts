export type Scan = {
  id: string
  urlId: string
  urlRandom: string
  userId: string
  ip: string | null
  userAgent: string | null
  responseMs: number | null
  scannedAt: string
}

export type CreateScanInput = {
  urlId: string
  urlRandom: string
  userId: string
  ip?: string | null
  userAgent?: string | null
  responseMs?: number | null
  scannedAt?: string
}
