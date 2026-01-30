#!/bin/bash
###############################################################################
# 健康检查脚本
# 功能：定期检查 LIMS Next.js 应用健康状态，异常时自动重启
# 用法：./scripts/health-check.sh
# Crontab: */5 * * * * /path/to/scripts/health-check.sh >> /var/log/lims-health.log 2>&1
###############################################################################

# 配置项
HEALTH_URL="http://localhost:3000/api/health"
MAX_RETRIES=3
RETRY_DELAY=5
PM2_APP_NAME="lims-next"
LOG_FILE="./logs/health-check.log"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log() {
  local level=$1
  shift
  local message="$@"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# 发送告警通知（可扩展）
send_alert() {
  local message=$1

  # TODO: 集成钉钉/企业微信/邮件通知
  # 钉钉 Webhook 示例：
  # curl -X POST "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN" \
  #   -H 'Content-Type: application/json' \
  #   -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"❌ LIMS 服务异常\\n$message\"}}"

  log "ALERT" "$message"
}

# 健康检查主逻辑
check_health() {
  for i in $(seq 1 $MAX_RETRIES); do
    HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" -m 10 "$HEALTH_URL")

    case $HTTP_CODE in
      200)
        log "OK" "服务健康 (HTTP $HTTP_CODE, Retry $i/$MAX_RETRIES)"
        return 0
        ;;
      503)
        log "WARN" "服务降级 (HTTP $HTTP_CODE, Retry $i/$MAX_RETRIES)"
        if [ $i -eq $MAX_RETRIES ]; then
          return 1
        fi
        ;;
      000)
        log "ERROR" "无法连接到服务 (Retry $i/$MAX_RETRIES)"
        if [ $i -eq $MAX_RETRIES ]; then
          return 1
        fi
        ;;
      *)
        log "ERROR" "服务异常 (HTTP $HTTP_CODE, Retry $i/$MAX_RETRIES)"
        if [ $i -eq $MAX_RETRIES ]; then
          return 1
        fi
        ;;
    esac

    sleep $RETRY_DELAY
  done

  return 1
}

# 重启服务
restart_service() {
  log "ACTION" "正在重启服务..."

  # 检查 PM2 是否存在
  if ! command -v pm2 &> /dev/null; then
    log "ERROR" "PM2 未安装，无法自动重启"
    send_alert "PM2 未安装，需要手动重启服务"
    return 1
  fi

  # 重启 PM2 应用
  pm2 restart "$PM2_APP_NAME" >> "$LOG_FILE" 2>&1

  if [ $? -eq 0 ]; then
    log "OK" "服务重启成功"
    send_alert "LIMS 服务已自动重启（健康检查失败后恢复）"

    # 等待服务启动
    sleep 10

    # 再次检查
    if check_health; then
      log "OK" "服务重启后恢复正常"
      return 0
    else
      log "ERROR" "服务重启后仍然异常"
      send_alert "LIMS 服务重启失败，需要人工介入"
      return 1
    fi
  else
    log "ERROR" "服务重启失败"
    send_alert "LIMS 服务重启失败，请检查 PM2 状态"
    return 1
  fi
}

# 主流程
main() {
  log "INFO" "开始健康检查..."

  if check_health; then
    log "OK" "健康检查通过"
    exit 0
  else
    log "ERROR" "健康检查失败，准备重启服务"
    send_alert "LIMS 服务健康检查失败（连续 $MAX_RETRIES 次），正在自动重启"

    if restart_service; then
      log "OK" "服务恢复流程完成"
      exit 0
    else
      log "ERROR" "服务恢复失败，需要人工介入"
      exit 1
    fi
  fi
}

# 执行主流程
main
