export type UserId = string

export type User = {
  id: UserId
  name: string | null
  email: string | null
  username: string | null
  timezone: string | null
  language: string | null
  theme: string | null
  usernameChangedAt: string | null
  createdAt: string
}

export type UpsertUserInput = {
  id: UserId
  name: string | null
  email: string | null
}

export type UpdateUserInput = {
  name?: string | null
  username?: string | null
  timezone?: string | null
  language?: string | null
  theme?: string | null
  usernameChangedAt?: string | null
}
