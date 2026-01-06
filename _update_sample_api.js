const fs = require('fs');
const path = require('path');

const filePath = path.join('src', 'app', 'api', 'sample', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 更新编号规则
content = content.replace(/YP\$\{today\}/g, 'S${today}');
content = content.replace(/padStart\(4, '0'\)/g, "padStart(3, '0')");

// 添加状态和日期
content = content.replace(
  /data: \{ \.\.\.data, sampleNo \}/,
  "data: { ...data, sampleNo, status: data.status || 'received', receiptDate: new Date() }"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated');
