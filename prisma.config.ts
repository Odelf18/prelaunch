import "dotenv/config";
import { defineConfig } from "prisma/config";

// Fallback so `prisma generate` works on Vercel without DATABASE_URL at install time.
const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
