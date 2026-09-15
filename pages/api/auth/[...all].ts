import { getAuthInstance } from "../../../lib/auth";
import { toNodeHandler } from "better-auth/node";

export default toNodeHandler(getAuthInstance());

export const config = {
    api: {
        bodyParser: false,
    },
};
