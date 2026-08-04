import { defineConfig, env } from "prisma/config";

process.env.DATABASE_URL ??= "mongodb://placeholder:placeholder@localhost:27017/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
