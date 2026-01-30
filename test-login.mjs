import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testLogin() {
  console.log('🔐 开始登录测试...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 800
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    // 1. 访问登录页
    console.log('📍 步骤 1: 访问登录页');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    console.log('   ✅ 登录页加载完成\n');

    // 2. 填写登录信息
    console.log('📍 步骤 2: 填写管理员账号');
    await page.fill('input[name="username"], input[type="text"]', 'admin');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    console.log('   ✅ 账号密码已填写\n');

    // 截图：填写完成
    await page.screenshot({ path: join(__dirname, 'screenshot-filled.png'), fullPage: true });
    console.log('   📸 已保存截图: screenshot-filled.png\n');

    // 3. 点击登录按钮
    console.log('📍 步骤 3: 点击登录按钮');
    const loginButton = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("登 录")').first();
    await loginButton.click();
    console.log('   ✅ 已点击登录按钮\n');

    // 等待响应
    await page.waitForTimeout(2000);

    // 4. 检查登录结果
    console.log('📍 步骤 4: 检查登录结果');
    const currentUrl = page.url();
    console.log(`   当前 URL: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      console.log('   ⚠️  仍在登录页，检查错误信息...\n');

      // 查找错误提示
      const errorMessages = await page.locator('text=/error|错误|失败|invalid/i').allTextContents();
      if (errorMessages.length > 0) {
        console.log('   错误信息:', errorMessages.join(', '));
      }

      await page.screenshot({ path: join(__dirname, 'screenshot-login-error.png'), fullPage: true });
      console.log('   📸 已保存错误截图: screenshot-login-error.png\n');

    } else {
      console.log('   ✅ 登录成功，已跳转!\n');

      // 等待页面加载
      await page.waitForLoadState('networkidle');

      // 截图：登录后页面
      await page.screenshot({ path: join(__dirname, 'screenshot-dashboard.png'), fullPage: true });
      console.log('   📸 已保存仪表盘截图: screenshot-dashboard.png\n');

      // 获取页面标题
      const title = await page.title();
      console.log(`   页面标题: ${title}`);

      // 获取页面主要内容
      const bodyText = await page.locator('body').innerText();
      console.log(`   页面内容预览 (前300字符):\n   ${bodyText.substring(0, 300).replace(/\n/g, '\n   ')}\n`);
    }

    // 保持浏览器打开一段时间
    console.log('⏱️  浏览器将在 5 秒后关闭...');
    await page.waitForTimeout(5000);

    console.log('✅ 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await page.screenshot({ path: join(__dirname, 'screenshot-test-error.png'), fullPage: true });
    console.log('   📸 已保存错误截图: screenshot-test-error.png');
  } finally {
    await browser.close();
  }
}

testLogin().catch(console.error);
