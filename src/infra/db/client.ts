import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const runtimeDatabaseUrl =
  process.env.NODE_ENV === "test"
    ? process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
    : process.env.DATABASE_URL;

if (!runtimeDatabaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

if (process.env.NODE_ENV === "test") {
  const configuredTestUrl = process.env.TEST_DATABASE_URL;
  if (!configuredTestUrl) {
    throw new Error(
      "TEST_DATABASE_URL is required when running tests. Refusing to use the default DATABASE_URL for test execution.",
    );
  }

  if (configuredTestUrl === process.env.DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL must be different from DATABASE_URL. Refusing to run tests against the primary database.",
    );
  }
}

const pool = new Pool({
  connectionString: runtimeDatabaseUrl,
});

export const db = drizzle(pool);
