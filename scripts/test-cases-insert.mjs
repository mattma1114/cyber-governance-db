import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 模拟 cases.create 的插入操作
  const [result] = await conn.execute(
    `INSERT INTO cases (type, title, titleEn, topicId, jurisdictionId, date, source, sourceUrl, abstract, aiSummary, aiAnalysis, tags, language, fullText, status, views)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'legislation',
      '测试内容标题',
      'Test Title',
      'data-privacy',
      'eu',
      '2024-01-01',
      '',
      'https://example.com',
      '测试摘要',
      '测试AI摘要',
      '测试AI分析',
      JSON.stringify([]),
      'zh',
      '测试原文全文',
      'draft',
      0
    ]
  );
  console.log('插入成功！insertId:', result.insertId);
  
  // 清理测试数据
  await conn.execute('DELETE FROM cases WHERE title = ?', ['测试内容标题']);
  console.log('测试数据已清理');
} catch (err) {
  console.error('插入失败：', err.message);
  console.error('错误代码：', err.code);
  console.error('SQL状态：', err.sqlState);
}

await conn.end();
