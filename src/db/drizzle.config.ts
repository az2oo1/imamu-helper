import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;
const port = Number(process.env.SQL_PORT) || 5432;

if (!process.env.DATABASE_URL && (!sqlHost || !sqlDbName || !user || !password)) {
  console.warn("Missing SQL admin environment variables. Drizzle kit might fail.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
      }
    : {
        host: sqlHost || 'localhost',
        port,
        user: user || 'admin',
        password: password || 'pass',
        database: sqlDbName || 'db',
        ssl: false,
      },
  verbose: true,
});
