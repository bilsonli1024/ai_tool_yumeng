#!/bin/bash
# ============================================================
# 守护脚本 - amazon-ai-suite (Web)
# 用于 cron 每分钟检测并自动拉起服务
#
# cron 配置示例（crontab -e）：
#   * * * * * /bin/bash /your/project/path/watchdog.sh
# ============================================================

# ---------- 路径配置 ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$LOG_DIR/web.pid"
LOG_FILE="$LOG_DIR/watchdog.log"
START_SCRIPT="$SCRIPT_DIR/start.sh"
APP_NAME="amazon-ai-suite"

# ---------- 日志保留天数（超过此天数自动清理）----------
LOG_KEEP_DAYS=7

# ---------- 初始化日志目录 ----------
mkdir -p "$LOG_DIR"

# ---------- 日志函数 ----------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WATCHDOG] $1" >> "$LOG_FILE"
}

# ---------- 自动清理旧日志（每天执行一次）----------
CLEAN_LOCK="$LOG_DIR/.last_clean"
TODAY=$(date '+%Y-%m-%d')
if [ ! -f "$CLEAN_LOCK" ] || [ "$(cat "$CLEAN_LOCK")" != "$TODAY" ]; then
    find "$LOG_DIR" -name "*.log" -mtime +$LOG_KEEP_DAYS -delete 2>/dev/null
    echo "$TODAY" > "$CLEAN_LOCK"
    log "已清理 $LOG_KEEP_DAYS 天前的旧日志"
fi

# ---------- 检查进程状态 ----------
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")

    if [ -n "$PID" ] && ps -p "$PID" > /dev/null 2>&1; then
        # 进程正常运行，静默退出（避免日志膨胀，仅在调试时可开启下行）
        # log "[$APP_NAME] 进程正常运行中，PID: $PID"
        exit 0
    else
        log "[$APP_NAME] 进程已停止（PID: $PID），准备重新拉起..."
        rm -f "$PID_FILE"
    fi
else
    log "[$APP_NAME] PID 文件不存在，服务未运行，准备启动..."
fi

# ---------- 拉起服务 ----------
if [ ! -f "$START_SCRIPT" ]; then
    log "错误：启动脚本不存在：$START_SCRIPT"
    exit 1
fi

bash "$START_SCRIPT"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    NEW_PID=$(cat "$PID_FILE" 2>/dev/null)
    log "[$APP_NAME] 服务已成功拉起，PID: $NEW_PID"
else
    log "错误：[$APP_NAME] 服务拉起失败，exit code: $EXIT_CODE，请检查日志：$LOG_DIR/web.log"
fi

