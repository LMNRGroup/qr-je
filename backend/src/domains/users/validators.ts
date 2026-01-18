const USERNAME_REGEX = /^[a-z0-9_]{3,18}$/
const BLOCKED_USERNAMES = [
  'admin',
  'support',
  'root',
  'owner',
  'staff',
  'moderator',
  'help',
  'official',
  'fuck',
  'shit',
  'bitch',
  'bastard',
  'asshole',
  'dick',
  'nigger',
  'faggot',
  'cunt',
  'rape',
  'racist',
  'nazi'
]

export const normalizeUsername = (value: string) => value.trim().toLowerCase()

export const validateUsername = (value: string) => {
  const normalized = normalizeUsername(value)
  if (!USERNAME_REGEX.test(normalized)) {
    return {
      ok: false,
      message: 'Username must be 3-18 characters and use only letters, numbers, or underscores.'
    } as const
  }

  const blocked = BLOCKED_USERNAMES.find((word) => normalized.includes(word))
  if (blocked) {
    return {
      ok: false,
      message: 'Please keep it family friendly.'
    } as const
  }

  return { ok: true, value: normalized } as const
}
