import { betterAuth } from "better-auth";
import { Pool } from "pg";

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
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        })
    }
    return pool
}

export const auth = betterAuth({
    database: getPool(),
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: getAuthBaseURL(),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: getTrustedOrigins(),
});

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
