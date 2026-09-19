import { describe, expect, test } from 'bun:test'

import type { Vcard } from '../vcards/models'
import { buildVcardLandingHtml } from './public-links'

const CANONICAL_URL = 'https://qrcode.luminarapps.com/1vbilcikwj/ramn-figueroa-soto'
const YOUTUBE_URL = 'https://youtu.be/y4mFeeLgQLw?si=pSiDkTQw_wIYw60y'

const makeVcard = (): Vcard => ({
  id: 'test-vcard',
  userId: 'test-owner',
  slug: 'ramn-figueroa-soto',
  publicUrl: 'https://qrcode.luminarapps.com/v/legacy-ramon',
  shortId: 'test-qr',
  shortRandom: 'test-short-code',
  data: {
    profile: {
      name: 'Ramon Figueroa Soto',
      company: 'RAMONTCG',
      phone: '7879205231',
      email: 'ramon@example.com',
      location: 'Hormigueros, PR',
      socials: { instagram: 'https://instagram.com/ramontcg' },
      favoriteSocial: 'instagram',
    },
  },
  createdAt: '2026-09-19T00:00:00.000Z',
})

describe('Ramontcg YouTube bio spotlight', () => {
  test('renders the exact video link immediately after Instagram, not in contact rows', () => {
    const html = buildVcardLandingHtml(makeVcard(), CANONICAL_URL)
    const socialRow = html.match(/<div class="social-row">([\s\S]*?)<\/div>/)?.[1] ?? ''
    const links = socialRow.match(/<a\b[\s\S]*?<\/a>/g) ?? []

    expect(links).toHaveLength(2)
    expect(links[0]).toContain('https://instagram.com/ramontcg')
    expect(links[1]).toContain(`href="${YOUTUBE_URL}"`)
    expect(links[1]).toContain('class="qrc-youtube-spotlight"')
    expect(links[1]).toContain('target="_blank"')
    expect(links[1]).toContain('rel="noreferrer"')
    expect(links[1]).toContain('aria-label="Watch @ramontcg on YouTube (opens in a new tab)"')
    expect(links[1]).toContain('>Watch on YouTube</span>')
    expect(links[1]).toContain('>New</span>')
    expect(links[1]).toContain('<svg')
    expect(html.match(/class="qrc-youtube-spotlight"/g)).toHaveLength(1)
    expect(html.slice(html.indexOf('<div class="column-side">'))).not.toContain(YOUTUBE_URL)
    expect(html).toContain('contact-count">3 ways</span>')
  })

  test('keeps the promo next to Instagram even when other socials exist', () => {
    const vcard = makeVcard()
    vcard.data.profile = {
      socials: {
        instagram: 'https://instagram.com/ramontcg',
        facebook: 'https://facebook.com/ramontcg',
        youtube: 'https://youtube.com/@ramontcg',
        tiktok: 'https://tiktok.com/@ramontcg',
      },
    }
    const html = buildVcardLandingHtml(vcard, CANONICAL_URL)
    const socialRow = html.match(/<div class="social-row">([\s\S]*?)<\/div>/)?.[1] ?? ''
    const links = socialRow.match(/<a\b[\s\S]*?<\/a>/g) ?? []
    expect(links).toHaveLength(5)
    expect(links[0]).toContain('https://instagram.com/ramontcg')
    expect(links[1]).toContain(YOUTUBE_URL)
    expect(links[2]).toContain('https://facebook.com/ramontcg')
  })

  test('still renders one spotlight if Instagram is removed', () => {
    const vcard = makeVcard()
    vcard.data.profile = { name: 'Ramon' }
    const html = buildVcardLandingHtml(vcard, CANONICAL_URL)
    expect(html).toContain('<div class="social-row"><a class="qrc-youtube-spotlight"')
    expect(html.match(/class="qrc-youtube-spotlight"/g)).toHaveLength(1)
    expect(html).not.toContain('class="contact-row"')
  })

  test('uses the resolved canonical identity without modifying the stored legacy URL or data', () => {
    const vcard = makeVcard()
    const before = structuredClone(vcard)

    expect(buildVcardLandingHtml(vcard, `${CANONICAL_URL}/`)).toContain(YOUTUBE_URL)
    expect(vcard).toEqual(before)
  })

  test('does not add the video to other owners, cards, or the separate test card', () => {
    for (const path of [
      '/another-owner/ramn-figueroa-soto',
      '/1vbilcikwj/another-card',
      '/19t0a0u1b4/r',
    ]) {
      const html = buildVcardLandingHtml(makeVcard(), `https://qrcode.luminarapps.com${path}`)
      expect(html).not.toContain(YOUTUBE_URL)
      expect(html).toContain('contact-count">3 ways</span>')
    }
  })
})
