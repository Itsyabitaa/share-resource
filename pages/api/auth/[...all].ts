import { auth } from "../../../lib/auth";
import { toNodeHandler } from "better-auth/node";
import type { NextApiRequest, NextApiResponse } from "next";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const LIMIT = 5
const WINDOW_MS = 60 * 1000

function getIP(req: NextApiRequest): string {
    const forwarded = req.headers["x-forwarded-for"]
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress
    return ip || "127.0.0.1"
}

const handler = toNodeHandler(auth);

export default async function authHandler(req: NextApiRequest, res: NextApiResponse) {
    const url = req.url || ""
    const isAuthWrite = req.method === "POST" && (url.includes("/sign-in") || url.includes("/sign-up"))

    if (isAuthWrite) {
        const ip = getIP(req)
        const now = Date.now()
        const record = rateLimitMap.get(ip)

        if (!record || now > record.resetTime) {
            rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS })
        } else {
            record.count++
            if (record.count > LIMIT) {
                res.status(429).json({ error: "Too many requests. Please try again later." })
                return
            }
        }
    }

    return handler(req, res);
}

export const config = {
    api: {
        bodyParser: false,
    },
};
