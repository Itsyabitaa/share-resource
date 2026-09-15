import { betterAuth } from "better-auth";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

function getAuthBaseURL() {
    const configured = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL
    if (configured) {
        return configured.replace(/\/+$/, '')
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`
    }

    return "http://localhost:3000"
}

function getTrustedOrigins() {
    const origins = new Set<string>([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ])

    const candidates = [
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
        "https://mdnest.vercel.app",
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}` : undefined,
        process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, '')}`
            : undefined,
    ]

    for (const candidate of candidates) {
        if (!candidate) continue
        origins.add(candidate.replace(/\/+$/, ''))
    }

    return Array.from(origins)
}

let pool: Pool | undefined

function getPool() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is not set")
        }

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        })
    }
    return pool
}

function getSocialProviders() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        return undefined
    }

    return {
        google: {
            clientId,
            clientSecret,
        },
    }
}

function createAuth() {
    const socialProviders = getSocialProviders()

    return betterAuth({
        database: getPool(),
        secret: process.env.BETTER_AUTH_SECRET!,
        baseURL: getAuthBaseURL(),
        emailAndPassword: {
            enabled: true,
        },
        account: {
            accountLinking: {
                enabled: true,
                trustedProviders: socialProviders ? ['google'] : [],
            },
        },
        ...(socialProviders ? { socialProviders } : {}),
        trustedOrigins: getTrustedOrigins(),
    })
}

let authInstance: ReturnType<typeof createAuth> | undefined

export function getAuthInstance() {
    if (!authInstance) {
        authInstance = createAuth()
    }
    return authInstance
}

export const auth = new Proxy({} as ReturnType<typeof createAuth>, {
    get(_target, prop, receiver) {
        const instance = getAuthInstance() as any
        const value = instance[prop]
        return typeof value === 'function' ? value.bind(instance) : Reflect.get(instance, prop, receiver)
    },
    has(_target, prop) {
        return prop in getAuthInstance()
    },
})

export async function getUser(req: any) {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });
        return session?.user || null;
    } catch (error) {
        return null;
    }
}
