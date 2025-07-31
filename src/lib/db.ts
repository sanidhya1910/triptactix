import { PrismaClient } from '@prisma/client'

// Global variable to hold the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined
}

export function createPrismaClient() {
  if (typeof window !== 'undefined') {
    // Client-side: return a mock client
    throw new Error('Prisma client should not be used on the client side')
  }

  // For now, use regular SQLite for both local and production
  // We'll enhance this later when Prisma D1 adapter is more stable
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./dev.db'
      }
    }
  })
}

export function getPrismaClient(): PrismaClient {
  if (!globalThis.__prisma) {
    globalThis.__prisma = createPrismaClient()
  }
  return globalThis.__prisma
}

// For Cloudflare D1 direct access (when needed)
export interface CloudflareEnv {
  DB: any // D1Database type
}

// Export types for convenience
export type { PrismaClient } from '@prisma/client'
