import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const sqls = [
  // api_settings table
  `CREATE TABLE IF NOT EXISTS \`api_settings\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`key\` varchar(128) NOT NULL,
    \`value\` text NOT NULL,
    \`label\` varchar(256),
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`api_settings_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`api_settings_key_unique\` UNIQUE(\`key\`)
  )`,
  // cases.fullText
  `ALTER TABLE \`cases\` ADD COLUMN IF NOT EXISTS \`fullText\` text`,
  // platforms new fields
  `ALTER TABLE \`platforms\` ADD COLUMN IF NOT EXISTS \`website\` varchar(512)`,
  `ALTER TABLE \`platforms\` ADD COLUMN IF NOT EXISTS \`wikipediaUrl\` varchar(512)`,
  `ALTER TABLE \`platforms\` ADD COLUMN IF NOT EXISTS \`crunchbaseUrl\` varchar(512)`,
  `ALTER TABLE \`platforms\` ADD COLUMN IF NOT EXISTS \`profileFeatures\` text`,
  `ALTER TABLE \`platforms\` ADD COLUMN IF NOT EXISTS \`developmentHistory\` text`,
];

for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log("✓", sql.slice(0, 60).replace(/\n/g, " ").trim());
  } catch (e) {
    if (e.message.includes("Duplicate column") || e.message.includes("already exists")) {
      console.log("⚠ Already exists:", sql.slice(0, 60).replace(/\n/g, " ").trim());
    } else {
      console.error("✗ Error:", e.message, "\nSQL:", sql.slice(0, 80));
    }
  }
}

await conn.end();
console.log("Migration complete");
