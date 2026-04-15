#!/bin/bash

# Shopping Street Site ローカルサーバー起動スクリプト
# 使い方: ./server.sh [-p PORT] [-b] [-s] [-d]

set -euo pipefail

# デフォルト設定
DEFAULT_PORT=8000
PORT=$DEFAULT_PORT
BUILD_ONLY=false
SKIP_BUILD=false
DEV_MODE=false
BUILD_DIR="build/html"

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_build() {
    echo -e "${PURPLE}🔨 $1${NC}"
}

log_server() {
    echo -e "${CYAN}🚀 $1${NC}"
}

# ヘルプ表示
show_help() {
    cat << EOF
Shopping Street Site ローカルサーバー起動スクリプト

使い方: $0 [オプション]

オプション:
  -p PORT        サーバーのポートを指定 (デフォルト: $DEFAULT_PORT)
  -b             ビルドのみ実行し、サーバーは起動しない
  -s             ビルドをスキップし、サーバーのみ起動
  -d             開発モード（ファイル監視付き）
  -h, --help     このヘルプを表示

例:
  $0                    # ビルド&サーバー起動（デフォルト）
  $0 -p 3000           # ポート3000でビルド&サーバー起動
  $0 -b                 # ビルドのみ実行
  $0 -s                 # ビルドをスキップしてサーバー起動
  $0 -d                 # 開発モードで起動（ファイル監視）

EOF
}

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -p)
            PORT="$2"
            shift 2
            ;;
        -b)
            BUILD_ONLY=true
            shift
            ;;
        -s)
            SKIP_BUILD=true
            shift
            ;;
        -d)
            DEV_MODE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "不明なオプション: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# スクリプトディレクトリに移動
cd "$(dirname "$0")"

# Python仮想環境の確認とセットアップ
setup_environment() {
    log_info "環境をチェック中..."
    
    # 仮想環境の有無を確認
    if [ ! -d "venv" ]; then
        log_info "仮想環境を作成します..."
        python3 -m venv venv
    fi
    
    # 仮想環境を有効化
    if [ -z "${VIRTUAL_ENV:-}" ]; then
        source venv/bin/activate
    fi
    
    # 必要なパッケージの確認
    if ! python -c "import sphinx" 2>/dev/null; then
        log_info "必要なパッケージをインストールします..."
        pip install -r requirements.txt
    fi
    
    log_success "環境のセットアップ完了"
}

# ビルド実行
build_site() {
    log_build "Sphinxサイトをビルド中..."
    
    if ./venv/bin/sphinx-build -b html source build/html; then
        log_success "ビルド完了"
    else
        log_error "ビルドに失敗しました"
        exit 1
    fi
}

# ポートチェック
check_port() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "ポート $PORT は既に使用中です"
        echo "別のポートを試してください: $0 -p 8081"
        exit 1
    fi
}

# ビルドファイルの存在確認
check_build_files() {
    if [ ! -d "$BUILD_DIR" ]; then
        log_error "ビルドファイルが見つかりません: $BUILD_DIR"
        echo "まずビルドを実行してください: $0"
        exit 1
    fi
}

# URLをクリップボードにコピー
copy_to_clipboard() {
    local url="http://localhost:$PORT"
    
    if command -v pbcopy >/dev/null 2>&1; then
        echo "$url" | pbcopy
        log_info "URLをクリップボードにコピーしました: $url"
    elif command -v xclip >/dev/null 2>&1; then
        echo "$url" | xclip -selection clipboard
        log_info "URLをクリップボードにコピーしました: $url"
    else
        log_info "URL: $url"
    fi
}

# サーバー起動
start_server() {
    check_port
    check_build_files
    copy_to_clipboard
    
    log_server "サーバーを起動します: http://localhost:$PORT"
    log_info "停止するには Ctrl+C を押してください"
    echo ""
    
    cd "$BUILD_DIR"
    python -m http.server $PORT
}

# 開発モード（ファイル監視）
start_dev_server() {
    log_info "開発モードで起動します（ファイル監視付き）"
    
    # watchexecがなければインストール
    if ! command -v watchexec >/dev/null 2>&1; then
        log_info "watchexecをインストールします..."
        if command -v brew >/dev/null 2>&1; then
            brew install watchexec
        elif command -v cargo >/dev/null 2>&1; then
            cargo install watchexec
        else
            log_warning "watchexecが見つかりません。手動インストールが必要です"
            log_info "https://github.com/watchexec/watchexec#installation"
        fi
    fi
    
    # ファイル監視付きサーバー起動
    watchexec --exts rst,py,css,js,json --watch source --watch data --restart ./venv/bin/sphinx-build -b html source build/html &
    WATCH_PID=$!
    
    # 少し待ってからサーバー起動
    sleep 2
    start_server
    
    # 終了時にwatchexecも停止
    trap "kill $WATCH_PID 2>/dev/null || true" EXIT
}

# メイン処理
main() {
    echo "� Shopping Street Site サーバー"
    echo "================================"
    echo ""
    
    # 環境セットアップ
    setup_environment
    echo ""
    
    # ビルド実行（スキップオプションがなければ）
    if [ "$SKIP_BUILD" = false ]; then
        build_site
        echo ""
    else
        log_info "ビルドをスキップします"
        echo ""
    fi
    
    # ビルドのみモードの場合はここで終了
    if [ "$BUILD_ONLY" = true ]; then
        log_success "ビルド完了。ファイルは $BUILD_DIR/ にあります"
        exit 0
    fi
    
    # 開発モードか通常モードかで分岐
    if [ "$DEV_MODE" = true ]; then
        start_dev_server
    else
        start_server
    fi
}

# 実行
main "$@"
