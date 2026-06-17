# Vogue News Portal — Opinion Media Portal

ひとつの出来事を、複数の新聞社・通信社がどう報じたかを並列に読み比べるための、Vogue 風モノクロデザインのシングルページ・ニュースサイト。Google ニュース RSS をライブ取得し、サインインしたユーザー個別に好みのカテゴリ・キーワードを学習して並び替えます。

> *Many Voices, One Page.*

## 特徴

- **ライブニュース取得** — Google ニュース RSS (TOP/NATION/WORLD/BUSINESS/TECHNOLOGY/ENTERTAINMENT) を `api.rss2json.com` 経由でページ読み込み時に取得し、全セクションを実ニュースに置換。すべての見出しは原文記事へのリンク
- **媒体名 → 公式サイト** — `朝日新聞` をクリックすれば `asahi.com` へなど、23 媒体を辞書登録
- **匿名学習 + サインイン識別** — Google Sign-In でユーザーを識別し、初回オンボーディングで興味カテゴリ/キーワードを収集。以後のクリックはカテゴリ・媒体・キーワードの 3軸で累積学習し、各セクションのニュースをパーソナルスコアで並び替え
- **4社以上の論調を並列表示** — TODAY 以外の各セクション (ECONOMY / TECH / CULTURE / WORLD / COMPARE / TIMELINE) は、1つのトピックに対し 4 社以上の媒体見出しを並列で表示
- **モノクロエディトリアルデザイン** — Playfair Display + Cormorant Garamond、IntersectionObserver による段階フェードアップ、株価ティッカー、ヒーロー微パララックス
- **完全クライアントサイド** — サーバー・ビルドツール不要。HTML + CSS + Vanilla JS のみ

## ファイル構成

```
ニュースアプリ/
├── index.html    # マークアップ + Onboarding modal
├── styles.css    # Vogue 風モノクロ + モーダル + サインイン UI
├── script.js     # フィード取得 / スコアリング / Sign-In / Onboarding
└── README.md
```

## 動作確認の方法

### 1. ローカルサーバーを起動 (必須)

`api.rss2json.com` への fetch と Google Sign-In は `file://` だと動かないため、必ず HTTP サーバー経由で開いてください。

```sh
cd "ニュースアプリ"
python -m http.server 8000
# → http://localhost:8000 をブラウザで開く
```

Node がある環境なら `npx serve .`、PHP なら `php -S localhost:8000` でも可。

### 2. Google Sign-In を有効化 (任意)

サインインなしでも全機能動作しますが、ユーザー識別を有効にするには Google OAuth Client ID が必要です。

#### Client ID の取得手順

1. [Google Cloud Console](https://console.cloud.google.com/) にログインしプロジェクトを作成 (or 既存を選択)
2. **APIs & Services → Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
3. (初回のみ) **Configure consent screen** を聞かれたら **External** を選択、アプリ名と連絡先メールを入力して保存
4. アプリケーションタイプ: **Web application**
5. **Authorized JavaScript origins** に開発環境のオリジンを追加:
   - `http://localhost:8000` (上記の `python -m http.server 8000` 用)
   - 本番ドメインがあればそれも
6. 作成された **Client ID** (`xxxx-yyyy.apps.googleusercontent.com`) をコピー
7. `script.js` の冒頭にある定数に貼り付ける:

```js
const GOOGLE_CLIENT_ID = 'xxxx-yyyy.apps.googleusercontent.com';
```

8. ブラウザでリロード → 画面右上の **SIGN IN** ボタンが機能するようになります

未設定のままだと SIGN IN ボタンはアラートで設定を促します (他機能は影響なし)。

## パーソナライゼーション仕様

### 識別

- **匿名 (デフォルト)**: ブラウザの `localStorage` のみで学習。デバイス間同期なし
- **サインイン後**: 画面右上にアバター + 名前。クリックで **Edit profile / Sign out** メニュー。`localStorage.opinion_user_v1` に `{sub, name, email, picture}` を保存 (外部送信なし)

### 学習信号

1. **オンボーディングアンケート** (明示的・高ウェイト)
   - 初回訪問時のモーダルで取得: 興味カテゴリ (POLITICS / ECONOMY / TECH / WORLD / CULTURE) / キーワード (自由入力) / 年代 / 職業
   - `localStorage.opinion_profile_v1` に保存
   - TODAY セクションの `Edit profile` でいつでも再表示、`Reset profile` で削除
2. **クリック履歴** (暗黙的・中ウェイト)
   - 記事クリック時に `{cat, source, title}` を記録
   - 累積データ: カテゴリ別カウント / 媒体別カウント (上位50保持) / キーワード別カウント (タイトル抽出, 上位80保持)
   - `localStorage.opinion_prefs_v1` に保存
   - `Reset clicks` ボタンでクリア

### スコアリング

各記事の表示順は `scoreItem(item) = w_recency + w_profile_cat + w_profile_kw + w_click_cat + w_click_source + w_click_kw` で算出。重み:

| 信号 | 係数 | 補足 |
|---|---|---|
| 24h 以内の新しさ | `0.02 × max(0, 24 - hours)` | 直近ほど高い |
| プロフィール興味カテゴリ一致 | +1.0 | 明示信号 |
| プロフィールキーワード一致 | +0.8 × 一致数 | 部分一致を含む |
| クリック履歴のカテゴリ重み | +0.6 × 正規化比率 | Laplace smoothing |
| クリックした媒体 | +0.2 × log(1+count) | 累積飽和 |
| クリックしたキーワード | +0.15 × log(1+count) | 累積飽和 |

学習履歴がまったく無いユーザーは RSS の元順を維持し、フィルターバブルが発生しにくい設計。

## プライバシー

- ユーザー情報 (`name` / `email` / `picture`) は **ブラウザの localStorage のみ** に保存され、外部サーバーへの送信は一切ありません
- Google Sign-In は ID Token (JWT) をクライアント側で base64 デコードして読むだけで、Google にもアプリ側にも保存されません
- Sign out / Reset profile / Reset clicks で随時クリア可能

## 技術スタック

- HTML / CSS / Vanilla JavaScript (フレームワーク不使用)
- Google Fonts: Playfair Display, Cormorant Garamond, Inter
- Google News RSS (経由: `api.rss2json.com` — 無料枠 10,000 req/day)
- Google Identity Services (sign-in)
- IntersectionObserver API (スクロールアニメーション)

---

© 2026 OPINION MEDIA PORTAL — A monochrome daily of many voices.
