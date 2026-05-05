import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 检查 cases 表的实际列结构
const [columns] = await conn.execute('DESCRIBE `cases`');
console.log('cases 表实际列：');
columns.forEach(col => console.log(`  ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} default=${col.Default}`));

// 检查是否有 full_text 列
const hasFullText = columns.some(col => col.Field === 'full_text');
console.log('\nhas full_text column:', hasFullText);

// 检查 platforms 表的新字段
const [pColumns] = await conn.execute('DESCRIBE `platforms`');
console.log('\nplatforms 表实际列：');
pColumns.forEach(col => console.log(`  ${col.Field}`));

await conn.end();
