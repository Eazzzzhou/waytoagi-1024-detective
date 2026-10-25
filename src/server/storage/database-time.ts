import type { Prisma, PrismaClient } from '../../generated/prisma/client'

/** Prisma's application-side timestamp defaults must not schedule work against a different clock. */
export async function readDatabaseTime(db: PrismaClient | Prisma.TransactionClient): Promise<Date> {
  const [row] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`
  if (!row) throw new Error('Database clock unavailable')
  return row.now
}
