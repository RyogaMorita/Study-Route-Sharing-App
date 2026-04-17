# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # 依存パッケージのインストール
npx expo start       # 開発サーバー起動（Expo Go / Web）
npx expo start --web # Web のみ起動
npx expo start --clear # キャッシュクリアして起動
npx expo install --fix # Expo SDK に合わせてパッケージバージョンを自動修正
```

## Architecture

React Native (Expo SDK 55) + Supabase + React Navigation のシングルページアプリ。

### 画面フロー（App.js）

```
未ログイン          → AuthScreen
ログイン済・プロフィール未設定 → ProfileSetupScreen（onComplete で hasProfile=true）
ログイン済・プロフィール設定済 → MainTabs（BottomTabNavigator）
```

`MainTabs` コンポーネントは `useTheme()` を使うため `ThemeProvider` の内側に定義している。

### テーマシステム（lib/ThemeContext.js）

- `lightTheme` / `darkTheme` オブジェクトで全色トークンを管理
- `cardShadow` をエクスポート（iOS shadow + Android elevation のセット）
- `useTheme()` フックで `{ theme, isDark, toggleTheme, resetToSystem, manualOverride, cardShadow }` を取得

### Supabase（lib/supabase.js）

- anon キーはクライアントに公開される設計（`sb_publishable_` プレフィックス）
- セキュリティは Supabase の RLS ポリシーで担保
- Supabase ダッシュボードで Anonymous sign-in を有効化する必要がある

### 環境変数・秘密情報の扱い

- **`.env` は `.gitignore` で除外済み。絶対にコミットしないこと**
- `.env.example` をテンプレートとして使用する
- Expo では `EXPO_PUBLIC_` プレフィックスを付けた変数のみクライアントコードで参照可能
- 現在使用している環境変数：`EXPO_PUBLIC_ANTHROPIC_API_KEY`
- `console.log` に認証情報・トークン・パスワードを出力しないこと

### 主要テーブル

`user_profiles`, `my_books`, `pomodoro_logs`, `published_routes`, `published_books`, `route_likes`, `route_comments`, `friends`, `friend_requests`, `monthly_badges`

### AIコーチ（screens/AISuggestScreen.js）

- `process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY` からAPIキーを読み込む
- **1日 10回のレート制限**を AsyncStorage で管理（`ai_usage_YYYY-MM-DD` キー）
- APIキー未設定時はエラーメッセージを表示するだけで例外は発生しない
- 本番運用では Supabase Edge Function 経由に変更するとキーをクライアントに渡さずに済む

## 注意事項

- `ProfileSetupScreen` は `onComplete`（初回セットアップ）と `onClose`（編集時）の両プロップを受け取る
- モバイルの確認ダイアログは `window.confirm` ではなく `Alert.alert` を使う
- タブバーのスタイリングは `MainTabs` 内で `useTheme()` を使って動的に適用
