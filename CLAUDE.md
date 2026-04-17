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
- **APIキーや秘密情報は `.env` ファイルに書き `.gitignore` で除外すること**
- Supabase ダッシュボードで Anonymous sign-in を有効化する必要がある

### 主要テーブル

`user_profiles`, `my_books`, `pomodoro_logs`, `published_routes`, `published_books`, `route_likes`, `route_comments`, `friends`, `friend_requests`, `monthly_badges`

### AIコーチ（screens/AISuggestScreen.js）

Anthropic API を直接呼び出しているが **APIキーが未設定**。本番運用では Supabase Edge Function 経由に変更する必要がある。

## 注意事項

- `ProfileSetupScreen` は `onComplete`（初回セットアップ）と `onClose`（編集時）の両プロップを受け取る
- モバイルの確認ダイアログは `window.confirm` ではなく `Alert.alert` を使う
- タブバーのスタイリングは `MainTabs` 内で `useTheme()` を使って動的に適用
