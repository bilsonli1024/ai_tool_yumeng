#!/bin/bash
# ============================================================
# 服务启动脚本 - amazon-ai-suite (Web)
# 用法: bash start.sh
# ============================================================

# ---------- 环境变量（nvm 安装的 node/npm，cron 环境需手动指定路径）----------
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# nvm 加载后 npm 应在 PATH 中；同时保留硬编码路径兜底
NPM_BIN="$(command -v npm 2>/dev/null || echo '/root/.nvm/versions/node/v22.22.1/bin/npm')"
export PATH="$(dirname "$NPM_BIN"):$PATH"

if [ ! -x "$NPM_BIN" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [START] 错误：找不到可执行的 npm ($NPM_BIN)" | tee -a "${LOG_DIR:-/tmp}/web.log"
    exit 1
fi

# ---------- 路径配置 ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$SCRIPT_DIR/web"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$LOG_DIR/web.pid"
LOG_FILE="$LOG_DIR/web.log"
APP_NAME="amazon-ai-suite"

# ---------- 初始化日志目录 ----------
mkdir -p "$LOG_DIR"

# ---------- 日志函数 ----------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [START] $1" | tee -a "$LOG_FILE"
}

# ---------- 检查是否已在运行 ----------
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        log "[$APP_NAME] 服务已在运行中，PID: $PID，无需重复启动"
        exit 0
    else
        log "[$APP_NAME] 发现残留 PID 文件（PID: $PID 已失效），清理中..."
        rm -f "$PID_FILE"
    fi
fi

# ---------- 检查 web 目录 ----------
if [ ! -d "$WEB_DIR" ]; then
    log "错误：web 目录不存在：$WEB_DIR"
    exit 1
fi

# ---------- 检查 node_modules ----------
if [ ! -d "$WEB_DIR/node_modules" ]; then
    log "[$APP_NAME] 未检测到 node_modules，正在执行 npm install..."
    cd "$WEB_DIR" && "$NPM_BIN" install >> "$LOG_FILE" 2>&1
    if [ $? -ne 0 ]; then
        log "错误：npm install 失败，请检查日志：$LOG_FILE"
        exit 1
    fi
    log "[$APP_NAME] npm install 完成"
fi

# ---------- 启动服务 ----------
log "[$APP_NAME] 正在启动服务（端口 3000）..."

cd "$WEB_DIR" || { log "错误：无法进入目录 $WEB_DIR"; exit 1; }

nohup "$NPM_BIN" run dev >> "$LOG_FILE" 2>&1 &
PID=$!

# 稍等确认进程存活
sleep 2
if ps -p "$PID" > /dev/null 2>&1; then
    echo "$PID" > "$PID_FILE"
    log "[$APP_NAME] 服务启动成功，PID: $PID，日志文件: $LOG_FILE"
else
    log "错误：[$APP_NAME] 服务启动失败，请检查日志：$LOG_FILE"
    exit 1
fi

