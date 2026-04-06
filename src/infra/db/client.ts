import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const runtimeDatabaseUrl =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : process.env.TEST_DATABASE_URL;

if (!runtimeDatabaseUrl) {
  const expectedVariable =
    process.env.NODE_ENV === "production" ? "DATABASE_URL" : "TEST_DATABASE_URL";
  throw new Error(`${expectedVariable} is not configured`);
}

if (process.env.NODE_ENV !== "production") {
  const configuredTestUrl = process.env.TEST_DATABASE_URL;
  if (!configuredTestUrl) {
    throw new Error(
      "TEST_DATABASE_URL is required outside production. Refusing to use the primary production database for local or test execution.",
    );
  }

  if (configuredTestUrl === process.env.DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL must be different from DATABASE_URL. Refusing to run outside production against the primary database.",
    );
  }
}

const pool = new Pool({
  connectionString: runtimeDatabaseUrl,
});

export const db = drizzle(pool);
