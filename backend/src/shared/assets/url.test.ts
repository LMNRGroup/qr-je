import { beforeEach, describe, expect, test } from 'bun:test'

import {
  extractStoragePath,
  isAllowedAssetPath,
  rewriteAssetUrl,
  rewriteOptionsAssetUrls
} from './url'

// Other test files overwrite APP_BASE_URL at module load, so pin it before each test.
beforeEach(() => {
  process.env.APP_BASE_URL = 'https://api.test'
})

const SUPABASE_URL =
  'https://abcdef.supabase.co/storage/v1/object/public/qr-assets/menus/menu-1.png'

describe('extractStoragePath', () => {
  test('extracts path from legacy Supabase public URLs', () => {
    expect(extractStoragePath(SUPABASE_URL)).toBe('menus/menu-1.png')
  })

  test('extracts path from proxy URLs', () => {
    expect(extractStoragePath('https://api.test/public/assets/files/abc.pdf')).toBe('files/abc.pdf')
  })

  test('decodes URI-encoded characters', () => {
    expect(extractStoragePath('https://api.test/public/assets/menus/my%20menu.png')).toBe('menus/my menu.png')
  })

  test('returns null for unrelated URLs', () => {
    expect(extractStoragePath('https://example.com/page')).toBeNull()
  })
})

describe('isAllowedAssetPath', () => {
  test('allows the known folders', () => {
    expect(isAllowedAssetPath('files/a.pdf')).toBe(true)
    expect(isAllowedAssetPath('menus/b.png')).toBe(true)
    expect(isAllowedAssetPath('logos/c.jpg')).toBe(true)
  })

  test('rejects unknown folders and traversal', () => {
    expect(isAllowedAssetPath('secrets/d.txt')).toBe(false)
    expect(isAllowedAssetPath('files/../secrets/d.txt')).toBe(false)
    expect(isAllowedAssetPath('/files/a.pdf')).toBe(false)
    expect(isAllowedAssetPath('files\\a.pdf')).toBe(false)
  })
})

describe('rewriteAssetUrl', () => {
  test('rewrites Supabase public URLs to the proxy', () => {
    expect(rewriteAssetUrl(SUPABASE_URL)).toBe('https://api.test/public/assets/menus/menu-1.png')
  })

  test('leaves other URLs untouched', () => {
    expect(rewriteAssetUrl('https://example.com/page')).toBe('https://example.com/page')
    expect(rewriteAssetUrl('https://api.test/public/assets/files/a.pdf')).toBe(
      'https://api.test/public/assets/files/a.pdf'
    )
  })
})

describe('rewriteOptionsAssetUrls', () => {
  test('rewrites every known asset reference in options', () => {
    const options = {
      fileUrl: SUPABASE_URL,
      menuLogo: SUPABASE_URL,
      photo: SUPABASE_URL,
      menuFiles: [{ url: SUPABASE_URL, type: 'image' }, { url: 'https://cdn.other.com/x.png' }],
      adaptiveSlots: [{ id: 'a', fileUrl: SUPABASE_URL }, { id: 'b', url: 'https://example.com' }],
      adaptive: { slots: [{ id: 'c', fileUrl: SUPABASE_URL }] },
      untouched: 'value'
    }

    const rewritten = rewriteOptionsAssetUrls(options)!
    const proxy = 'https://api.test/public/assets/menus/menu-1.png'

    expect(rewritten.fileUrl).toBe(proxy)
    expect(rewritten.menuLogo).toBe(proxy)
    expect(rewritten.photo).toBe(proxy)
    expect((rewritten.menuFiles as Array<{ url: string }>)[0].url).toBe(proxy)
    expect((rewritten.menuFiles as Array<{ url: string }>)[1].url).toBe('https://cdn.other.com/x.png')
    expect((rewritten.adaptiveSlots as Array<{ fileUrl?: string }>)[0].fileUrl).toBe(proxy)
    expect((rewritten.adaptiveSlots as Array<{ url?: string }>)[1].url).toBe('https://example.com')
    expect(((rewritten.adaptive as { slots: Array<{ fileUrl?: string }> }).slots)[0].fileUrl).toBe(proxy)
    expect(rewritten.untouched).toBe('value')
  })

  test('passes through null/undefined options', () => {
    expect(rewriteOptionsAssetUrls(null)).toBeNull()
    expect(rewriteOptionsAssetUrls(undefined)).toBeUndefined()
  })
})
