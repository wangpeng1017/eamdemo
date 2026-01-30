import { test, expect } from '@playwright/test'

test.describe('LIMS Next - E2E Tests', () => {

  test('1. 首页应重定向到登录页', async ({ page }) => {
    // 访问首页
    await page.goto('/')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')

    // 截图 - 重定向后的页面
    await page.screenshot({
      path: 'artifacts/01-homepage-redirect.png',
      fullPage: true
    })

    // 验证已重定向到登录页
    await expect(page).toHaveURL(/\/login/)
  })

  test('2. 登录页UI元素检查', async ({ page }) => {
    // 直接访问登录页
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // 截图 - 登录页
    await page.screenshot({
      path: 'artifacts/02-login-page.png',
      fullPage: true
    })

    // 验证页面标题
    const title = page.locator('h1')
    await expect(title).toHaveText('LIMS')

    // 验证副标题
    const subtitle = page.locator('p').filter({ hasText: '实验室信息管理系统' })
    await expect(subtitle).toBeVisible()

    // 验证输入框
    const phoneInput = page.locator('input[placeholder="手机号"]')
    await expect(phoneInput).toBeVisible()

    const passwordInput = page.locator('input[placeholder="密码"]')
    await expect(passwordInput).toBeVisible()

    // 验证登录按钮
    const loginButton = page.locator('button[type="submit"]')
    await expect(loginButton).toBeVisible()
    await expect(loginButton).toHaveText('登录')

    // 验证快捷登录按钮
    const quickLoginButtons = page.locator('button').filter({ hasText: /管理员|秦兴国|张馨|刘丽愉|严秋平/ })
    const count = await quickLoginButtons.count()
    expect(count).toBeGreaterThanOrEqual(5)

    console.log(`✓ 登录页UI元素检查通过：手机号输入框、密码输入框、登录按钮、${count}个快捷登录按钮`)
  })

  test('3. 默认值检查', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // 验证默认值（admin / admin123）
    const phoneInput = page.locator('input[placeholder="手机号"]')
    await expect(phoneInput).toHaveValue('admin')

    const passwordInput = page.locator('input[placeholder="密码"]')
    await expect(passwordInput).toHaveValue('admin123')

    // 截图 - 显示默认值
    await page.screenshot({
      path: 'artifacts/03-login-default-values.png',
      fullPage: true
    })

    console.log('✓ 默认值检查通过：admin / admin123')
  })

  test('4. 使用管理员账号登录', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // 点击登录按钮（使用默认的 admin 账号）
    const loginButton = page.locator('button[type="submit"]')
    await loginButton.click()

    // 等待登录完成并跳转
    await page.waitForURL(/^\/$|^\/(?!login)/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // 截图 - 登录成功后的页面
    await page.screenshot({
      path: 'artifacts/04-after-login.png',
      fullPage: true
    })

    // 验证已离开登录页
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/login')

    console.log(`✓ 管理员登录成功，跳转到: ${currentUrl}`)
  })

  test('5. 快捷登录按钮功能', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // 点击管理员快捷登录按钮
    const adminQuickButton = page.locator('button').filter({ hasText: '管理员' }).first()
    await adminQuickButton.click()

    // 等待登录完成
    await page.waitForURL(/^\/$|^\/(?!login)/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // 截图 - 快捷登录后
    await page.screenshot({
      path: 'artifacts/05-quick-login-result.png',
      fullPage: true
    })

    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/login')

    console.log(`✓ 快捷登录成功，跳转到: ${currentUrl}`)
  })

  test('6. 登录后主页面截图', async ({ page }) => {
    // 先登录
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const loginButton = page.locator('button[type="submit"]')
    await loginButton.click()

    await page.waitForURL(/^\/$|^\/(?!login)/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // 等待更长时间确保页面完全加载
    await page.waitForTimeout(2000)

    // 截图 - 主页面
    await page.screenshot({
      path: 'artifacts/06-main-page.png',
      fullPage: true
    })

    console.log('✓ 主页面截图已保存')
  })

  test('7. 错误登录测试', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // 清空默认值并输入错误的凭据
    const phoneInput = page.locator('input[placeholder="手机号"]')
    await phoneInput.fill('wronguser')

    const passwordInput = page.locator('input[placeholder="密码"]')
    await passwordInput.fill('wrongpassword')

    // 截图 - 输入错误凭据
    await page.screenshot({
      path: 'artifacts/07-wrong-credentials-input.png',
      fullPage: true
    })

    // 点击登录
    const loginButton = page.locator('button[type="submit"]')
    await loginButton.click()

    // 等待错误消息出现
    await page.waitForTimeout(2000)

    // 截图 - 错误提示
    await page.screenshot({
      path: 'artifacts/08-login-error.png',
      fullPage: true
    })

    // 验证仍在登录页（登录失败）
    await expect(page).toHaveURL(/\/login/)

    console.log('✓ 错误凭据登录测试通过（正确地拒绝了无效登录）')
  })
})
