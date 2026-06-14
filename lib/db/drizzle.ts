import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

export const isDbConfigured = !!process.env.POSTGRES_URL;

let client: any = null;
let db: any = null;

if (isDbConfigured) {
	client = postgres(process.env.POSTGRES_URL!);
	db = drizzle(client, { schema });
} else {
	console.warn("POSTGRES_URL environment variable is not set. Falling back to local file-based database.");
}

export { client, db };

