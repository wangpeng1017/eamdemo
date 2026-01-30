import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testApp() {
  console.log('🚀 启动浏览器测试...\n');

  const browser = await chromium.launch({
    headless: false,  // 可视化浏览器
    slowMo: 500       // 慢速演示
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    // 1. 测试首页重定向
    console.log('📍 测试 1: 访问首页 http://localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log(`   当前 URL: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      console.log('   ✅ 正确重定向到登录页\n');
    } else {
      console.log('   ⚠️  未重定向到登录页\n');
    }

    // 截图1: 登录页
    await page.screenshot({ path: join(__dirname, 'screenshot-login.png'), fullPage: true });
    console.log('   📸 已保存截图: screenshot-login.png\n');

    // 2. 检查登录页面元素
    console.log('📍 测试 2: 检查登录页面元素');

    const usernameInput = await page.locator('input[name="username"], input[type="text"]').count();
    const passwordInput = await page.locator('input[name="password"], input[type="password"]').count();
    const loginButton = await page.locator('button:has-text("登录"), button:has-text("Login")').count();

    console.log(`   用户名输入框: ${usernameInput > 0 ? '✅ 找到' : '❌ 未找到'}`);
    console.log(`   密码输入框: ${passwordInput > 0 ? '✅ 找到' : '❌ 未找到'}`);
    console.log(`   登录按钮: ${loginButton > 0 ? '✅ 找到' : '❌ 未找到'}\n`);

    // 3. 获取页面标题
    const title = await page.title();
    console.log(`📍 测试 3: 页面标题`);
    console.log(`   标题: ${title}\n`);

    // 4. 检查页面加载状态
    console.log('📍 测试 4: 页面加载性能');
    const performanceTiming = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        responseTime: timing.responseEnd - timing.requestStart
      };
    });

    console.log(`   页面加载时间: ${performanceTiming.loadTime}ms`);
    console.log(`   DOM 就绪时间: ${performanceTiming.domReady}ms`);
    console.log(`   响应时间: ${performanceTiming.responseTime}ms\n`);

    // 5. 获取页面完整 HTML 结构预览
    console.log('📍 测试 5: 页面结构分析');
    const bodyText = await page.locator('body').innerText();
    console.log(`   页面文本长度: ${bodyText.length} 字符`);
    console.log(`   页面预览 (前200字符):\n   ${bodyText.substring(0, 200).replace(/\n/g, '\n   ')}\n`);

    // 等待一段时间让用户查看
    console.log('⏱️  浏览器将在 5 秒后关闭...');
    await page.waitForTimeout(5000);

    console.log('✅ 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await page.screenshot({ path: join(__dirname, 'screenshot-error.png'), fullPage: true });
    console.log('   📸 已保存错误截图: screenshot-error.png');
  } finally {
    await browser.close();
  }
}

testApp().catch(console.error);
