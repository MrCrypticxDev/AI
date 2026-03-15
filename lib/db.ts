import { PrismaClient } from '@prisma/client'

declare global {
  // Prevent multiple Prisma instances in dev (Next.js hot reload)
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const db = global.__prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = db
}
