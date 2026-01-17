import { getSupabaseAdminConfig } from '../../../config/supabase'
import { Vcard } from '../models'
import { VcardsStorage } from './interface'

type VcardRow = {
  id: string
  user_id: string
  slug: string
  public_url: string
  short_id: string
  short_random: string
  data: Record<string, unknown>
  created_at: string
}

export class SupabaseVcardsStorageAdapter implements VcardsStorage {
  private readonly restUrl: string
  private readonly serviceRoleKey: string

  constructor() {
    const { restUrl, serviceRoleKey } = getSupabaseAdminConfig()
    this.restUrl = restUrl
    this.serviceRoleKey = serviceRoleKey
  }

  async createVcard(vcard: Vcard) {
    await this.request('vcards', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: vcard.id,
        user_id: vcard.userId,
        slug: vcard.slug,
        public_url: vcard.publicUrl,
        short_id: vcard.shortId,
        short_random: vcard.shortRandom,
        data: vcard.data,
        created_at: vcard.createdAt
      })
    })
  }

  async getById(id: string) {
    const rows = await this.requestJson<VcardRow[]>(
      `vcards?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async getByUserId(userId: string) {
    const rows = await this.requestJson<VcardRow[]>(
      `vcards?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
    )
    return rows.map((row) => this.mapRow(row))
  }

  async getByUserIdAndSlug(userId: string, slug: string) {
    const rows = await this.requestJson<VcardRow[]>(
      `vcards?select=*&user_id=eq.${encodeURIComponent(userId)}&slug=eq.${encodeURIComponent(slug)}&limit=1`
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async deleteById(id: string) {
    await this.request(`vcards?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
  }

  private mapRow(row: VcardRow): Vcard {
    return {
      id: row.id,
      userId: row.user_id,
      slug: row.slug,
      publicUrl: row.public_url,
      shortId: row.short_id,
      shortRandom: row.short_random,
      data: row.data,
      createdAt: row.created_at
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
