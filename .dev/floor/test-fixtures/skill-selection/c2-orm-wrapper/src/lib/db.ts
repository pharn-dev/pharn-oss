import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";

// The one database handle. Every server module imports `db` from here.
export const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });
