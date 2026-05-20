import { getAppBaseUrl } from '../src/config/env'
import { createUrlsService } from '../src/domains/urls/service'
import {
  buildLegacyVcardPath,
  buildPublicPath,
  getStoredLegacyAliases,
  withStoredVcardAliases,
} from '../src/domains/urls/public-links'
import { InMemoryUrlsStorageAdapter } from '../src/domains/urls/storage/memory.adapter'
import { SupabaseUrlsStorageAdapter } from '../src/domains/urls/storage/supabase.adapter'
import { isVcardKind } from '../src/domains/vcards/kind'
import { createVcardsService } from '../src/domains/vcards/service'
import { InMemoryVcardsStorageAdapter } from '../src/domains/vcards/storage/memory.adapter'
import { SupabaseVcardsStorageAdapter } from '../src/domains/vcards/storage/supabase.adapter'
import type { UrlsStorage } from '../src/domains/urls/storage/interface'
import type { VcardsStorage } from '../src/domains/vcards/storage/interface'

type AuditEntry = {
  shortId: string
  userId: string
  slug: string
  canonicalPath: string
  canonicalUrl: string
  primaryLegacyPath: string
  legacyPaths: string[]
  targetUrl: string
  targetPath: string
  needsAliasUpdate: boolean
  missingVcard: boolean
  liveStatus?: number | null
}

const args = new Set(Bun.argv.slice(2))
const apply = args.has('--apply')
const live = args.has('--live')

const shouldUseSupabase = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
const shouldUseDatabase = Boolean(process.env.SUPABASE_DB_URL)

const getUrlsStorage = async (): Promise<UrlsStorage> => {
  if (shouldUseDatabase) {
    const { DrizzleUrlsStorageAdapter } = await import('../src/domains/urls/storage/drizzle.adapter')
    return new DrizzleUrlsStorageAdapter()
  }
  if (shouldUseSupabase) {
    return new SupabaseUrlsStorageAdapter()
  }
  return new InMemoryUrlsStorageAdapter()
}

const getVcardsStorage = (): VcardsStorage => {
  if (shouldUseSupabase) {
    return new SupabaseVcardsStorageAdapter()
  }
  return new InMemoryVcardsStorageAdapter()
}

const safePathname = (value: string) => {
  try {
    return new URL(value).pathname
  } catch {
    return value
  }
}

const stableJson = (value: unknown) => JSON.stringify(value)

const main = async () => {
  const urlsService = createUrlsService(await getUrlsStorage())
  const vcardsService = createVcardsService(getVcardsStorage())
  const urls = await urlsService.getAllUrls()
  const vcardUrls = urls.filter((url) => isVcardKind(url.kind))
  const entries: AuditEntry[] = []

  for (const url of vcardUrls) {
    const vcard = await vcardsService.getByShortId(url.id)
    if (!vcard) {
      entries.push({
        shortId: url.id,
        userId: url.userId,
        slug: '',
        canonicalPath: '',
        canonicalUrl: '',
        primaryLegacyPath: '',
        legacyPaths: [],
        targetUrl: url.targetUrl,
        targetPath: safePathname(url.targetUrl),
        needsAliasUpdate: false,
        missingVcard: true,
      })
      continue
    }

    const canonicalPath = buildPublicPath(vcard.userId, vcard.slug)
    const primaryLegacyPath = buildLegacyVcardPath(vcard.slug)
    const nextOptions = withStoredVcardAliases(
      {
        id: url.id,
        userId: url.userId,
        targetUrl: url.targetUrl,
        name: url.name ?? null,
        kind: url.kind ?? null,
        options: url.options ?? null,
      },
      vcard.slug
    )
    const nextAliases = getStoredLegacyAliases(
      {
        kind: url.kind ?? null,
        targetUrl: url.targetUrl,
        options: nextOptions,
      },
      vcard.slug
    ).map((alias) => alias.oldPath)

    let liveStatus: number | null | undefined
    if (live) {
      const response = await fetch(`${getAppBaseUrl()}${primaryLegacyPath}`, { redirect: 'manual' }).catch(
        () => null
      )
      liveStatus = response?.status ?? null
    }

    entries.push({
      shortId: url.id,
      userId: url.userId,
      slug: vcard.slug,
      canonicalPath,
      canonicalUrl: `${getAppBaseUrl()}${canonicalPath}`,
      primaryLegacyPath,
      legacyPaths: nextAliases,
      targetUrl: url.targetUrl,
      targetPath: safePathname(url.targetUrl),
      needsAliasUpdate: stableJson(nextOptions) !== stableJson(url.options ?? null),
      missingVcard: false,
      liveStatus,
    })
  }

  const collisions = new Map<string, AuditEntry[]>()
  for (const entry of entries) {
    if (entry.missingVcard) continue
    for (const legacyPath of entry.legacyPaths) {
      const bucket = collisions.get(legacyPath) ?? []
      bucket.push(entry)
      collisions.set(legacyPath, bucket)
    }
  }

  const collisionPaths = Array.from(collisions.entries())
    .filter(([, bucket]) => bucket.length > 1)
    .map(([legacyPath, bucket]) => ({
      legacyPath,
      shortIds: bucket.map((entry) => entry.shortId),
      slugs: bucket.map((entry) => entry.slug),
    }))

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        checkedAt: new Date().toISOString(),
        totals: {
          vcardUrls: vcardUrls.length,
          missingVcards: entries.filter((entry) => entry.missingVcard).length,
          needsAliasUpdate: entries.filter((entry) => entry.needsAliasUpdate).length,
          collisions: collisionPaths.length,
          live404s: entries.filter((entry) => entry.liveStatus === 404).length,
        },
        entries,
        collisions: collisionPaths,
      },
      null,
      2
    )
  )

  if (!apply) {
    return
  }

  let updated = 0
  let skipped = 0

  for (const url of vcardUrls) {
    const vcard = await vcardsService.getByShortId(url.id)
    if (!vcard) {
      skipped += 1
      continue
    }

    const nextOptions = withStoredVcardAliases(
      {
        id: url.id,
        userId: url.userId,
        targetUrl: url.targetUrl,
        name: url.name ?? null,
        kind: url.kind ?? null,
        options: url.options ?? null,
      },
      vcard.slug
    )

    if (stableJson(nextOptions) === stableJson(url.options ?? null)) {
      continue
    }

    const aliasPaths = getStoredLegacyAliases(
      {
        kind: url.kind ?? null,
        targetUrl: url.targetUrl,
        options: nextOptions,
      },
      vcard.slug
    ).map((alias) => alias.oldPath)

    const hasCollision = aliasPaths.some((legacyPath) => (collisions.get(legacyPath)?.length ?? 0) > 1)
    if (hasCollision) {
      skipped += 1
      continue
    }

    await urlsService.updateUrl(url.id, url.userId, { options: nextOptions })
    updated += 1
  }

  console.log(
    JSON.stringify(
      {
        mode: 'apply',
        appliedAt: new Date().toISOString(),
        updated,
        skipped,
      },
      null,
      2
    )
  )
}

await main()
