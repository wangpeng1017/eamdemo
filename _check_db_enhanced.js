// 临时数据库检查脚本 - 增强版
const mysql = require('mysql2/promise');

async function checkDatabase() {
  console.log('正在连接到数据库...');
  console.log('主机: 8.130.182.148:3307');
  console.log('数据库: lims\n');

  const connection = await mysql.createConnection({
    host: '8.130.182.148',
    port: 3307,
    user: 'root',
    password: 'word_mysql_root',
    database: 'lims',
    connectTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
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
    console.log('字段名               类型                 允许空  键');
    console.log(''.padEnd(70, '='));
    structureResult.forEach(row => {
      const field = row.Field.padEnd(20);
      const type = (row.Type || '').padEnd(20);
      const nullStr = (row.Null || '').padEnd(5);
      const key = row.Key || '';
      console.log(`${field} ${type} ${nullStr} ${key}`);
    });
    console.log('');

    // 3. 查看最近5条记录
    console.log('=== 3. 最近5条记录 ===');
    const [rows] = await connection.execute(`
      SELECT id, sampleNo, name, type, quantity, unit, status, createdAt
      FROM biz_sample
      ORDER BY createdAt DESC
      LIMIT 5
    `);

    if (rows.length === 0) {
      console.log('⚠️  表中暂无数据\n');
    } else {
      rows.forEach((row, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log(`  ID:         ${row.id}`);
        console.log(`  样品编号:    ${row.sampleNo || '(空)'}`);
        console.log(`  样品名称:    ${row.name || '(空)'}`);
        console.log(`  样品类型:    ${row.type || '(空)'}`);
        console.log(`  数量:        ${row.quantity || '(空)'}`);
        console.log(`  单位:        ${row.unit || '(空)'}`);
        console.log(`  状态:        ${row.status}`);
        console.log(`  创建时间:    ${row.createdAt}`);
      });
      console.log('');
    }

    // 4. 检查是否有数据异常
    console.log('=== 4. 数据质量检查 ===');
    const [nullCheck] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM biz_sample
      WHERE sampleNo IS NULL OR name IS NULL OR status IS NULL
    `);
    console.log(`必填字段为空的记录数: ${nullCheck[0].count}`);

    const [statusCheck] = await connection.execute(`
      SELECT status, COUNT(*) as count
      FROM biz_sample
      GROUP BY status
    `);
    console.log('\n状态分布:');
    statusCheck.forEach(row => {
      console.log(`  ${row.status}: ${row.count} 条`);
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
  } finally {
    await connection.end();
    console.log('\n数据库连接已关闭');
  }
}

checkDatabase().catch(console.error);
