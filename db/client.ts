import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema.ts";

export type Database = NeonHttpDatabase<typeof schema>;

let cachedUrl: string | undefined;
let cachedDatabase: Database | undefined;

export function createDatabase(connectionString: string): Database {
  const client = neon(connectionString);
  return drizzle(client, { schema });
}

export function getDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!cachedDatabase || cachedUrl !== connectionString) {
    cachedUrl = connectionString;
    cachedDatabase = createDatabase(connectionString);
  }

  return cachedDatabase;
}

