import mysql from "mysql2/promise";

const sql = `
CREATE TABLE IF NOT EXISTS \`api_settings\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`key\` varchar(128) NOT NULL,
  \`value\` text NOT NULL,
  \`label\` varchar(256),
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`api_settings_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`api_settings_key_unique\` UNIQUE(\`key\`)
);
`;

const alterSql = `ALTER TABLE \`cases\` ADD COLUMN IF NOT EXISTS \`fullText\` text;`;

const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await conn.execute(sql);
  console.log("✓ api_settings table created");
  try {
    await conn.execute(alterSql);
    console.log("✓ fullText column added to cases");
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("ℹ fullText column already exists");
    } else {
      throw e;
    }
  }
} finally {
  await conn.end();
}
console.log("Migration complete");
