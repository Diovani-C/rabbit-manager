import { beforeEach } from "bun:test";
import { sql } from "drizzle-orm";
import { db } from "@/db/index";

if (process.env.NODE_ENV !== "test")
	throw new Error("NODE_ENV not set to test!");

/** Runs this before each test to clean the database */
beforeEach(async () => {
	const result = await db.execute(sql`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE '__drizzle_migrations'
    ORDER BY tablename
  `);

	const tableNames = result.map((row) => `"${row.tablename}"`).join(", ");

	if (tableNames.length > 0) {
		await db.execute(
			sql.raw(`
      SET session_replication_role = replica;
      TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;
      SET session_replication_role = DEFAULT;`),
		);
	}
});

export { db };
