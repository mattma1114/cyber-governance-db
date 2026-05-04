import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const sql = readFileSync(new URL("../drizzle/0002_uneven_silver_samurai.sql", import.meta.url), "utf-8");

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Split by --> statement-breakpoint and execute each statement
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

for (const stmt of statements) {
  try {
    console.log("Executing:", stmt.slice(0, 80) + "...");
    await conn.execute(stmt);
    console.log("✓ OK");
  } catch (e) {
    if (e.code === "ER_TABLE_EXISTS_ERROR" || e.code === "ER_DUP_FIELDNAME" || e.message?.includes("already exists") || e.message?.includes("Duplicate column")) {
      console.log("⚠ Already exists, skipping");
    } else {
      console.error("✗ Error:", e.message);
    }
  }
}

await conn.end();
console.log("Migration complete");
