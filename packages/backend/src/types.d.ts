import type { BunSQLDatabase } from "drizzle-orm/bun-sql";
import type * as schema from "./utils/db/schema";

export type Database = BunSQLDatabase<typeof schema>;
