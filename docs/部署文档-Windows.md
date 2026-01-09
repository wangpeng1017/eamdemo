# LIMS-Next 部署文档 - Windows Server 2019

> 最后更新: 2026-01-09 | 适用于 Claude Code 自动化部署

---

## 一、服务器信息模板

| 项目 | 值 |
|------|-----|
| 服务器IP | {待填写} |
| 操作系统 | Windows Server 2019 |
| 用户名 | Administrator |
| 密码 | {待填写} |
| 项目路径 | C:\lims-next |
| 服务端口 | 3001 |
| 服务名称 | lims-next |

---

## 二、环境要求

| 软件 | 版本要求 | 下载地址 |
|------|----------|----------|
| Node.js | >= 18.x | https://nodejs.org/dist/v18.19.0/node-v18.19.0-x64.msi |
| Git | >= 2.x | https://git-scm.com/download/win |
| PM2 | >= 5.x | npm 安装 |
| PostgreSQL | >= 14.x | https://www.postgresql.org/download/windows/ |

---

## 三、首次部署（全新服务器）

### 3.1 安装 Node.js

```powershell
# 方式一：下载 MSI 安装包
# 访问 https://nodejs.org/dist/v18.19.0/node-v18.19.0-x64.msi 下载并安装

# 方式二：使用 winget（Windows 包管理器）
winget install OpenJS.NodeJS.LTS

# 验证安装
node -v
npm -v
```

### 3.2 安装 Git

```powershell
# 方式一：下载安装包
# 访问 https://git-scm.com/download/win 下载并安装

# 方式二：使用 winget
winget install Git.Git

# 验证安装（需要重新打开 PowerShell）
git --version
```

### 3.3 安装 PM2 和 pm2-windows-startup

```powershell
# 全局安装 PM2
npm install -g pm2

# 安装 Windows 服务支持
npm install -g pm2-windows-startup
pm2-startup install

# 验证安装
pm2 -v
```

### 3.4 克隆项目

```powershell
# 进入目标目录
cd C:\

# 克隆项目
git clone https://github.com/wangpeng1017/0105LIMENEXT.git lims-next

# 进入项目目录
cd C:\lims-next
```

### 3.5 配置环境变量

在 `C:\lims-next` 目录下创建 `.env` 文件：

```powershell
# 使用 PowerShell 创建 .env 文件
@"
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/数据库名"
NEXTAUTH_SECRET="your-secret-key-here-change-this"
NEXTAUTH_URL="http://服务器IP:3001"
"@ | Out-File -FilePath C:\lims-next\.env -Encoding UTF8
```

或手动创建 `.env` 文件，内容如下：

```env
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/数据库名"
NEXTAUTH_SECRET="your-secret-key-here-change-this"
NEXTAUTH_URL="http://服务器IP:3001"
```

### 3.6 安装依赖并构建

```powershell
cd C:\lims-next

# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 同步数据库结构
npx prisma db push

# 构建项目
npm run build
```

### 3.7 启动服务

```powershell
# 进入 standalone 目录
cd C:\lims-next\.next\standalone

# 使用 PM2 启动
pm2 start server.js --name lims-next -- -p 3001

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2-startup install
```

---

## 四、快速部署脚本

### 4.1 创建部署脚本

在 `C:\lims-next` 目录下创建 `deploy.ps1`：

```powershell
# deploy.ps1 - LIMS-Next Windows 部署脚本
# 用法: .\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  LIMS-Next Windows 部署" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Set-Location C:\lims-next

# 1. 拉取最新代码
Write-Host "`n[1/5] 拉取最新代码..." -ForegroundColor Yellow
git pull

# 2. 检查依赖变更
Write-Host "`n[2/5] 检查依赖..." -ForegroundColor Yellow
$hashFile = "C:\lims-next\.package-hash"
$newHash = (Get-FileHash -Path "package.json" -Algorithm MD5).Hash
$oldHash = ""
if (Test-Path $hashFile) {
    $oldHash = Get-Content $hashFile
}

if ($newHash -ne $oldHash) {
    Write-Host "package.json 已变更，重新安装依赖..." -ForegroundColor Yellow
    npm install
    $newHash | Out-File -FilePath $hashFile -NoNewline
} else {
    Write-Host "依赖无变化，跳过安装" -ForegroundColor Green
}

# 3. 同步数据库
Write-Host "`n[3/5] 同步数据库..." -ForegroundColor Yellow
npx prisma db push

# 4. 构建项目
Write-Host "`n[4/5] 构建项目..." -ForegroundColor Yellow
npm run build

# 5. 复制静态文件并重启
Write-Host "`n[5/5] 部署并重启..." -ForegroundColor Yellow
Copy-Item -Path ".next\static" -Destination ".next\standalone\.next\" -Recurse -Force
Copy-Item -Path "public" -Destination ".next\standalone\" -Recurse -Force
pm2 restart lims-next

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  部署完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "访问地址: http://localhost:3001" -ForegroundColor Cyan
```

### 4.2 执行部署

```powershell
cd C:\lims-next
.\deploy.ps1
```

---

## 五、从本地 Mac/Linux 远程部署到 Windows

### 5.1 启用 Windows OpenSSH 服务

在 Windows Server 上执行（以管理员身份运行 PowerShell）：

```powershell
# 安装 OpenSSH 服务器
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# 启动 SSH 服务
Start-Service sshd

# 设置开机自启
Set-Service -Name sshd -StartupType 'Automatic'

# 配置防火墙
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

### 5.2 本地构建并上传（推荐）

在本地 Mac/Linux 执行：

```bash
# 1. 本地构建
cd /Users/wangpeng/Downloads/limsnext
npm run build

# 2. 打包
cd .next
tar -czf standalone.tar.gz standalone static
cd ..

# 3. 上传到 Windows 服务器
scp .next/standalone.tar.gz Administrator@{服务器IP}:C:/lims-next/

# 4. SSH 到服务器解压并重启
ssh Administrator@{服务器IP} "cd C:\lims-next && tar -xzf standalone.tar.gz -C .next && del standalone.tar.gz && pm2 restart lims-next"
```

### 5.3 创建 Windows 远程部署脚本

在本地创建 `deploy-windows.sh`：

```bash
#!/bin/bash
# LIMS-Next Windows 远程部署脚本
# 用法: ./deploy-windows.sh

set -e

SERVER="Administrator@{服务器IP}"
SERVER_PASS="{服务器密码}"
REMOTE_DIR="C:/lims-next"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  LIMS-Next Windows 远程部署"
echo "=========================================="

cd "$LOCAL_DIR"

# 1. 本地构建
echo ""
echo "[1/4] 本地构建项目..."
npm run build

# 2. 打包
echo ""
echo "[2/4] 打包构建产物..."
cd .next
tar -czf standalone.tar.gz standalone static
cd ..

# 3. 上传
echo ""
echo "[3/4] 上传到服务器..."
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no .next/standalone.tar.gz "$SERVER:$REMOTE_DIR/"

# 4. 远程部署
echo ""
echo "[4/4] 服务器部署..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "cd $REMOTE_DIR && tar -xzf standalone.tar.gz -C .next && del standalone.tar.gz && pm2 restart lims-next"

# 清理
rm -f .next/standalone.tar.gz

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
```

---

## 六、Claude Code 自动化部署命令

### Windows 本地部署（在 Windows 服务器上执行）

```powershell
# 完整部署
cd C:\lims-next
git pull
npm install
npx prisma db push
npm run build
Copy-Item -Path ".next\static" -Destination ".next\standalone\.next\" -Recurse -Force
Copy-Item -Path "public" -Destination ".next\standalone\" -Recurse -Force
pm2 restart lims-next
```

### 仅重启服务

```powershell
pm2 restart lims-next
```

### 查看日志

```powershell
pm2 logs lims-next --lines 50
```

### 查看服务状态

```powershell
pm2 status
```

---

## 七、数据库操作

### 同步 Schema

```powershell
cd C:\lims-next
npx prisma db push
```

### 执行 Seed（初始化数据）

```powershell
cd C:\lims-next
npm run db:seed
```

### 打开 Prisma Studio（数据库管理界面）

```powershell
cd C:\lims-next
npx prisma studio
```

---

## 八、防火墙配置

```powershell
# 开放 3001 端口
New-NetFirewallRule -DisplayName "LIMS-Next" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

# 开放 22 端口（SSH）
New-NetFirewallRule -DisplayName "SSH" -Direction Inbound -Protocol TCP -LocalPort 22 -Action Allow
```

---

## 九、IIS 反向代理（可选）

### 9.1 安装 URL Rewrite 和 ARR

1. 下载并安装 [URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)
2. 下载并安装 [Application Request Routing](https://www.iis.net/downloads/microsoft/application-request-routing)

### 9.2 配置反向代理

在 IIS 管理器中：

1. 选择服务器节点 → Application Request Routing Cache → Server Proxy Settings
2. 勾选 "Enable proxy"
3. 创建新网站，绑定域名
4. 添加 URL Rewrite 规则：

```xml
<rewrite>
    <rules>
        <rule name="ReverseProxyInboundRule" stopProcessing="true">
            <match url="(.*)" />
            <action type="Rewrite" url="http://localhost:3001/{R:1}" />
        </rule>
    </rules>
</rewrite>
```

---

## 十、故障排查

### 服务无法启动

```powershell
# 查看错误日志
pm2 logs lims-next --err --lines 100

# 检查端口占用
netstat -ano | findstr :3001

# 重新启动
pm2 delete lims-next
cd C:\lims-next\.next\standalone
pm2 start server.js --name lims-next -- -p 3001
```

### Node.js 版本问题

```powershell
# 检查版本
node -v

# 如果版本过低，重新安装
winget install OpenJS.NodeJS.LTS
```

### 权限问题

```powershell
# 以管理员身份运行 PowerShell
# 设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 路径问题

```powershell
# 确保使用正斜杠或双反斜杠
# 正确: C:/lims-next 或 C:\\lims-next
# 错误: C:\lims-next（在某些情况下会被转义）
```

---

## 十一、性能优化

### 增加 Node.js 内存限制

```powershell
# 设置环境变量
[Environment]::SetEnvironmentVariable("NODE_OPTIONS", "--max-old-space-size=4096", "Machine")
```

### PM2 集群模式

```powershell
# 使用多核 CPU
pm2 delete lims-next
cd C:\lims-next\.next\standalone
pm2 start server.js --name lims-next -i max -- -p 3001
pm2 save
```

---

## 十二、备份与恢复

### 备份数据库

```powershell
# PostgreSQL 备份
pg_dump -U 用户名 -h localhost -p 5432 数据库名 > C:\backup\lims_backup_$(Get-Date -Format "yyyyMMdd").sql
```

### 备份项目配置

```powershell
# 备份 .env 文件
Copy-Item C:\lims-next\.env C:\backup\.env.backup
```

---

## 十三、访问地址

- **HTTP**: http://{服务器IP}:3001
- **默认账号**: admin
- **默认密码**: admin123
