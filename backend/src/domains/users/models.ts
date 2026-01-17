export type UserId = string

export type User = {
  id: UserId
  name: string | null
  email: string | null
  createdAt: string
}

export type UpsertUserInput = {
  id: UserId
  name: string | null
  email: string | null
}
