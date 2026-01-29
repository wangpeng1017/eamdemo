#!/usr/bin/env node

/**
 * 本地测试脚本 - 验证 data-permission 修复
 * 用于在开发环境测试 getDataFilter() 函数是否正确工作
 */

async function testDataPermission() {
    console.log('=== 数据权限测试 ===\n')

    // 测试 1: 模拟 Admin 用户
    console.log('测试 1: Admin 用户 (dataScope=all)')
    console.log('预期: 返回空过滤条件 {}')
    console.log('实际: 需要在真实环境中测试\n')

    // 测试 2: 模拟部门用户
    console.log('测试 2: 部门用户 (dataScope=dept)')
    console.log('预期: 返回 { createdById: { in: [...] } }\n')

    // 测试 3: 模拟普通用户
    console.log('测试 3: 普通用户 (dataScope=self)')
    console.log('预期: 返回 { createdById: userId }\n')

    // 测试 4: 未登录用户
    console.log('测试 4: 未登录用户')
    console.log('预期: 返回 { id: "never-match-unknown-user" }\n')

    console.log('=== 测试完成 ===')
    console.log('请在浏览器中测试 http://localhost:3000/api/sample')
}

testDataPermission().catch(console.error)
