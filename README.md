# バーサイト

このサイトは商店街のバー情報をまとめた静的サイトです。

## 概要

- **技術栈**: Sphinx + Python
- **データソース**: Google Forms → Google Sheets → GitHub → 静的サイト
- **自動更新**: フォーム送信時にサイトが自動更新

## サイト構成

```
sphinx-site/
├── source/                    # ソースファイル
│   ├── index.rst             # トップページ
│   ├── bars/                 # バー詳細ページ
│   ├── _static/              # 静的ファイル
│   ├── _templates/           # テンプレート
│   └── conf.py               # Sphinx設定
├── data/                     # データファイル
│   ├── bars.json             # バー情報データ
│   └── shops.json            # 店舗情報データ
├── build/                    # ビルド出力
└── requirements.txt          # Python依存
```

## データ更新の流れ

1. **バー情報登録**: Googleフォームからバー情報を送信
2. **スプレッドシート保存**: フォーム回答がGoogle Sheetsに保存
3. **GAS自動実行**: Google Apps Scriptがトリガー実行
4. **JSON変換**: スプレッドシートデータをJSONに変換
5. **GitHub同期**: JSONファイルをGitHubリポジトリにプッシュ
6. **サイト再構築**: GitHub Actionsでサイトが自動ビルド

## 開発環境セットアップ

```bash
# Python環境構築
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存インストール
pip install -r requirements.txt

# ローカルビルド
make html

# ローカルサーバー起動
python -m http.server 8000 -d build/html
```

## データ形式

### bars.json
```json
[
  {
    "id": "bar-1",
    "slug": "example-bar",
    "name": "サンプルバー",
    "hours": "19:00-02:00",
    "sns_links": ["https://instagram.com/example"],
    "promotion": "おすすめカクテル",
    "published": true,
    "sort_order": 1,
    "detail_url": "/bars/example-bar.html"
  }
]
```

## カスタマイズ

### テーマ変更
- `source/_templates/` でテンプレートをカスタマイズ
- `source/_static/` でCSS/JSを追加

### データ項目追加
1. `gas/src/code.ts` の `BarRecord` インターフェースを更新
2. `source/_templates/` のテンプレートを更新
3. Googleフォームの項目を追加

## デプロイ

このサイトはGitHub Pagesで自動デプロイされます。

- **メインブランチ**: `main`
- **公開URL**: 設定されたGitHub Pages URL
- **ビルドトリガー**: `data/` ディレクトリの変更

## 管理方法

バー情報の管理はGoogleフォームから行います：

1. **新規登録**: フォームからバー情報を入力
2. **更新**: スプレッドシートで直接編集
3. **公開/非公開**: フォームの公開設定で制御

## ライセンス

このプロジェクトはMITライセンスで公開されています。

## 貢献

バグ報告や機能改善のプルリクエストを歓迎します。

---

*このサイトはGoogle Apps ScriptとGitHub Actionsで自動運用されています*
