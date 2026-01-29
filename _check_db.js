// 临时数据库检查脚本
const mysql = require('mysql2/promise');

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: 'lims_mysql_2024',
    database: 'lims'
  });

  try {
    console.log('✅ 数据库连接成功\n');

    // 1. 查询记录数
    console.log('=== 1. biz_sample 表记录数 ===');
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM biz_sample');
    console.log(`记录总数: ${countResult[0].total}\n`);

    // 2. 查看表结构
    console.log('=== 2. biz_sample 表结构 ===');
    const [structureResult] = await connection.execute('DESC biz_sample');
    structureResult.forEach(row => {
      console.log(`${row.Field.padEnd(20)} ${row.Type.padEnd(20)} ${row.Null.padEnd(5)} ${row.Key}`);
    });
    console.log('');

    // 3. 查看最近5条记录
    console.log('=== 3. 最近5条记录 ===');
    const [rows] = await connection.execute(`
      SELECT id, sampleNo, name, type, quantity, unit, status,
             DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') as createdAt
      FROM biz_sample
      ORDER BY createdAt DESC
      LIMIT 5
    `);

    if (rows.length === 0) {
      console.log('⚠️  表中暂无数据\n');
    } else {
      console.table(rows);
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkDatabase().catch(console.error);
