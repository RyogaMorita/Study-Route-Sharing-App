# StudyRoute 📚

学習ルートを設計・共有するReact Nativeアプリ。ポモドーロタイマー、統計、SNS機能、AIコーチを搭載。

---

## 機能

| 機能 | 説明 |
|------|------|
| 📚 マイルート | 教材を登録してドラッグで並び替え。ページ数・進捗管理 |
| 🍅 ポモドーロ | 集中タイマー。集中度・理解度を記録。スマホ裏返しで強制終了 |
| 🔍 探す | 他ユーザーのルートをコピーして活用。シェアコード対応 |
| 📊 統計 | 週間グラフ・ストリーク・バッジ・復習リマインド |
| 👥 フレンド | フレンド申請・ランキング比較 |
| 🏆 ランキング | 週間・累計・ストリークで全体順位を表示 |
| 🤖 AIコーチ | 学習状況を分析して今日やるべきことを提案（1日10回まで） |

---

## セットアップ

### 1. インストール

```bash
git clone https://github.com/RyogaMorita/Study-Route-Sharing-App.git
cd Study-Route-Sharing-App
npm install
```

### 2. 環境変数

```bash
cp .env.example .env
```

`.env` を開いてAPIキーを設定：

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-xxxxxx  # AIコーチ機能に必要
```

> ⚠️ `.env` は絶対にGitにコミットしないこと

### 3. Supabaseの設定

[Supabase ダッシュボード](https://supabase.com) で以下を有効化：

- **Authentication → Sign In / Providers → Allow anonymous sign-ins** をオン

### 4. 起動

```bash
npx expo start        # Expo Go / Web
npx expo start --web  # ブラウザのみ
```

---

## 技術スタック

- **React Native** (Expo SDK 55)
- **Supabase** (認証・データベース)
- **React Navigation** (BottomTabNavigator)
- **Anthropic Claude API** (AIコーチ)
- **EAS Build** (ビルド・配信)

---

## 注意事項

- Supabaseの無料プランは7日間アクセスがないとプロジェクトが停止します
- AIコーチはAPIキー未設定の場合、エラーメッセージを表示します
- Expo GoはSDK 55対応の最新版が必要です
