import { PrismaClient } from '@prisma/client'

const isServer = typeof window === 'undefined';

const getSanitizedDatabaseUrl = (): string | undefined => {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  url = url.replace(/[\r\n\t\s]+/g, "").trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  // Enforce healthy connection pool parameters for serverless Neon PgBouncer
  if (url.includes("connection_limit=")) {
    url = url.replace(/connection_limit=\d+/, "connection_limit=35");
  } else if (url.includes("?")) {
    url += "&connection_limit=35";
  } else {
    url += "?connection_limit=35";
  }
  if (url.includes("pool_timeout=")) {
    url = url.replace(/pool_timeout=\d+/, "pool_timeout=45");
  } else if (url.includes("?")) {
    url += "&pool_timeout=45";
  } else {
    url += "?pool_timeout=45";
  }
  return url;
};

const createPrismaClient = () => {
  const sanitizedUrl = getSanitizedDatabaseUrl();
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    ...(sanitizedUrl ? { datasources: { db: { url: sanitizedUrl } } } : {}),
  })

  return baseClient.$extends({
    query: {
      $allOperations({ model, operation, args, query }) {
        const executeWithRetry = async (retries = 3, delay = 500): Promise<any> => {
          try {
            return await query(args)
          } catch (error: any) {
            const isTransient =
              error?.code === 'P1001' || // Can't reach database server
              error?.code === 'P1008' || // Operations timed out
              error?.code === 'P1017' || // Server closed the connection
              error?.code === 'P2024' || // Timed out fetching a new connection from connection pool
              (typeof error?.message === 'string' &&
                (error.message.includes("Can't reach database server") ||
                 error.message.includes('Connection terminated') ||
                 error.message.includes('ECONNRESET') ||
                 error.message.includes('ETIMEDOUT') ||
                 error.message.includes('connection pool') ||
                 error.message.includes('Timed out fetching a new connection')));

            if (retries > 0 && isTransient) {
              console.warn(
                `[Prisma Resilience] Cold-start or connection lag/pool timeout detected for ${model ?? 'db'}.${operation} (code: ${error?.code || 'UNKNOWN'}). Retrying in ${delay}ms (${retries} attempts left)...`
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

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined
}

export const prisma: ExtendedPrismaClient =
  isServer
    ? (globalForPrisma.prisma ?? createPrismaClient())
    : (new Proxy({}, { get: () => () => ({}) }) as unknown as ExtendedPrismaClient)

if (isServer) {
  globalForPrisma.prisma = prisma
}
