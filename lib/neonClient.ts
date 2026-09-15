import { neon, NeonQueryFunction } from '@neondatabase/serverless'

let sql: NeonQueryFunction<false, false> | undefined

function getSql(): NeonQueryFunction<false, false> {
  if (!sql) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Add it to .env.local before running the app.'
      )
    }
    sql = neon(connectionString)
  }
  return sql
}

// Lazy proxy so importing this module during `next build` does not require DATABASE_URL.
const sqlProxy = ((strings: TemplateStringsArray | string, ...values: any[]) => {
  const client = getSql() as NeonQueryFunction<false, false> & {
    (query: string, params?: any[]): Promise<any>
  }
  if (typeof strings === 'string') {
    return client(strings, ...values)
  }
  return client(strings, ...values)
}) as NeonQueryFunction<false, false>

export default sqlProxy
