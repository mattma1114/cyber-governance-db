import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Drop and recreate with correct structure matching Drizzle schema
  await conn.execute("DROP TABLE IF EXISTS `api_settings`");
  console.log("✓ Dropped api_settings table");

  await conn.execute(`
    CREATE TABLE \`api_settings\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`key\` varchar(128) NOT NULL,
      \`value\` text NOT NULL,
      \`label\` varchar(256),
      \`createdAt\` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      \`updatedAt\` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`api_settings_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`api_settings_key_unique\` UNIQUE(\`key\`)
    )
  `);
  console.log("✓ Created api_settings table with correct structure");

  // Verify
  const [cols] = await conn.execute("SHOW COLUMNS FROM `api_settings`");
  console.log("Columns:", cols.map(c => c.Field).join(", "));

} catch (e) {
  console.error("Error:", e.message);
}

await conn.end();
console.log("Done");
