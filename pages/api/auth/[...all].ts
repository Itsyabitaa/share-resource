import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "../../../lib/auth";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return auth.handler(req, res);
}
