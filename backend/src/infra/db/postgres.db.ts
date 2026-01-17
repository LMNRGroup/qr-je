import { drizzle } from 'drizzle-orm/postgres-js'
import * as postgres from 'postgres'

import { getDatabaseConfig } from '../../config/db'

const { databaseUrl } = getDatabaseConfig()

const client = postgres(databaseUrl, {
  ssl: 'require'
})

export const db = drizzle(client)
