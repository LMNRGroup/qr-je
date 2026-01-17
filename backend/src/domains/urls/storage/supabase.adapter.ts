import { getSupabaseAdminConfig } from '../../../config/supabase'
import { Url } from '../models'
import { UrlsStorage } from './interface'

type UrlRow = {
  id: string
  random: string
  user_id: string
  target_url: string
  name?: string | null
  created_at: string
  options?: Record<string, unknown> | null
  kind?: string | null
}

export class SupabaseUrlsStorageAdapter implements UrlsStorage {
  private readonly restUrl: string
  private readonly serviceRoleKey: string

  constructor() {
    const { restUrl, serviceRoleKey } = getSupabaseAdminConfig()
    this.restUrl = restUrl
    this.serviceRoleKey = serviceRoleKey
  }

  async createUrl(url: Url) {
    await this.request('urls', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: url.id,
        random: url.random,
        user_id: url.userId,
        target_url: url.targetUrl,
        name: url.name ?? null,
        created_at: url.createdAt,
        options: url.options ?? null,
        kind: url.kind ?? null
      })
    })
  }

  async getByIdAndRandom(id: string, random: string) {
    const rows = await this.requestJson<UrlRow[]>(
      `urls?select=*&id=eq.${encodeURIComponent(id)}&random=eq.${encodeURIComponent(random)}&limit=1`
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async getById(id: string) {
    const rows = await this.requestJson<UrlRow[]>(
      `urls?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async existsById(id: string) {
    const rows = await this.requestJson<Pick<UrlRow, 'id'>[]>(
      `urls?select=id&id=eq.${encodeURIComponent(id)}&limit=1`
    )
    return rows.length > 0
  }

  async getByUserId(userId: string) {
    const rows = await this.requestJson<UrlRow[]>(
      `urls?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
    )
    return rows.map((row) => this.mapRow(row))
  }

  async getAll() {
    const rows = await this.requestJson<UrlRow[]>('urls?select=*')
    return rows.map((row) => this.mapRow(row))
  }

  async deleteById(id: string) {
    await this.request(`urls?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
  }

  async updateById(id: string, userId: string, updates: Partial<Url>) {
    const payload: Record<string, unknown> = {}
    if (updates.targetUrl !== undefined) payload.target_url = updates.targetUrl
    if (updates.name !== undefined) payload.name = updates.name
    if (updates.options !== undefined) payload.options = updates.options
    if (updates.kind !== undefined) payload.kind = updates.kind

    const rows = await this.requestJson<UrlRow[]>(
      `urls?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&select=*`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      }
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  private mapRow(row: UrlRow): Url {
    return {
      id: row.id,
      random: row.random,
      userId: row.user_id,
      targetUrl: row.target_url,
      name: row.name ?? null,
      createdAt: row.created_at,
      options: row.options ?? null,
      kind: row.kind ?? null
    }
  }

  private async request(path: string, init?: RequestInit) {
    const response = await fetch(`${this.restUrl}/${path}`, {
      ...init,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Supabase request failed (${response.status}): ${errorText}`)
    }

    return response
  }

  private async requestJson<T>(path: string, init?: RequestInit) {
    const response = await this.request(path, init)
    return (await response.json()) as T
  }
}
