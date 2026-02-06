#!/usr/bin/env node
/**
 * LIMS-Next 启动脚本 - 加载 .env 文件后启动服务器
 */

const fs = require('fs');
const path = require('path');

// 加载 .env 文件
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
 const envContent = fs.readFileSync(envPath, 'utf-8');
 envContent.split('\n').forEach(line => {
 line = line.trim();
 if (line && !line.startsWith('#')) {
 const [key, ...valueParts] = line.split('=');
 if (key && valueParts.length > 0) {
 let value = valueParts.join('=').trim();
 // 移除引号
 value = value.replace(/^["']|["']$/g, '');
 process.env[key.trim()] = value;
 }
 }
 });
 console.log('✅ .env 文件已加载');
}

// 启动 Next.js 服务器
require('./server.js');
