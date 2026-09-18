# my-recipe 設計書

食材からAIがレシピを考案する「my-recipe」アプリの設計ドキュメント一式です。
このアプリを初めて引き継ぐ人が、これらのドキュメントだけを読んで「なぜこう作ったか」を理解し、
環境構築からコードの変更まで一人で行えることを目標にしています。

## ドキュメント構成

| ドキュメント | 内容 |
|---|---|
| [01_requirements.md](./01_requirements.md) | 要件定義書。何のために・誰のために・何を作るかを定義 |
| [02_basic-design.md](./02_basic-design.md) | 基本設計書。システム構成・画面・データベースの全体像を定義 |
| [03_detailed-design.md](./03_detailed-design.md) | 詳細設計書。画面・処理・テーブルの詳細仕様を定義 |
| [04_environment-setup.md](./04_environment-setup.md) | 環境構築手順書。Supabase / Vercel / Claude APIのセットアップ手順とトラブルシューティング |

### 関連ドキュメント(設計書ではないもの)

| ドキュメント | 内容 |
|---|---|
| [../tutorial/00_index.md](../tutorial/00_index.md) | 学習教材。このアプリを題材に、Webアプリ開発が全くの初心者でもゼロから作れるよう、設計の考え方・製造手順・文法の基礎まで解説したもの |

## 現在の進捗

環境構築完了・デプロイ済み。次は試験(画面の打鍵確認・試験成績書の作成)。

- デプロイ先URL: https://my-recipe-gold-ten.vercel.app/
- Supabase・Vercel・Anthropicのセットアップは [04_environment-setup.md](./04_environment-setup.md) の手順で実施済み
- レシピ生成API・お気に入り機能とも、デプロイ後に実際の動作を確認済み

## 開発の背景

このアプリは、Anthropic社のAIアシスタント「Claude」(Claude Code)を使って、
ウォーターフォール型の開発プロセス(要件定義 → 基本設計 → 詳細設計 → 製造 → 試験)で開発されています。
オーナーがクライアントとして要件を定義し、基本設計・詳細設計はClaudeが提案する形で進めています。
