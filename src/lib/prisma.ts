import { PrismaClient } from '@prisma/client'

const createPrismaClient = () => {
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

  return baseClient.$extends({
    query: {
      $allOperations({ model, operation, args, query }) {
        const executeWithRetry = async (retries = 2, delay = 1200): Promise<any> => {
          try {
            return await query(args)
          } catch (error: any) {
            const isTransient =
              error?.code === 'P1001' || // Can't reach database server
              error?.code === 'P1008' || // Operations timed out
              error?.code === 'P1017' || // Server closed the connection
              (typeof error?.message === 'string' &&
                (error.message.includes("Can't reach database server") ||
                 error.message.includes('Connection terminated') ||
                 error.message.includes('ECONNRESET') ||
                 error.message.includes('ETIMEDOUT')));

            if (retries > 0 && isTransient) {
              console.warn(
                `[Prisma Resilience] Cold-start or connection lag detected for ${model ?? 'db'}.${operation}. Retrying in ${delay}ms (${retries} attempts left)...`
              )
              await new Promise((resolve) => setTimeout(resolve, delay))
              return executeWithRetry(retries - 1, delay * 1.5)
            }
            throw error
          }
        }
        return executeWithRetry()
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const PRISMA_INSTANCE_VERSION = "v2-resilient"

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined
  prismaVersion: string | undefined
}

export const prisma =
  globalForPrisma.prisma && globalForPrisma.prismaVersion === PRISMA_INSTANCE_VERSION
    ? globalForPrisma.prisma
    : createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaVersion = PRISMA_INSTANCE_VERSION
}
