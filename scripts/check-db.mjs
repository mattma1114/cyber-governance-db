import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check api_settings table structure
const [cols] = await conn.execute("SHOW COLUMNS FROM `api_settings`");
console.log("api_settings columns:", JSON.stringify(cols, null, 2));

// Try a direct select
try {
  const [rows] = await conn.execute("SELECT * FROM `api_settings` LIMIT 5");
  console.log("Direct select result:", JSON.stringify(rows, null, 2));
} catch (e) {
  console.error("Direct select error:", e.message);
}

await conn.end();
