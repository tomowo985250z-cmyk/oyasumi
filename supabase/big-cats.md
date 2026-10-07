# 大ねこ

`big-cats.sql` を既存の `wild-cats.sql` / `cat-coat-cooldown.sql` 適用後にSQL Editorで実行する。4種の許可値だけを追加する。既存プロフィール・投稿・履歴・集計・RLS・変更制限のトリガー・06:00境界は変更しない。変更制限が7日または30日のいずれでも、その設定と開始時刻を維持する。

- `snow-leopard`: ユキヒョウ
- `leopard`: ヒョウ
- `cheetah`: チーター
- `jaguar`: ジャガー

確定済み24枚を `assets/big-cats/<species>-faces-<expression>.png` に個別保存。元画像と同一バイトの1254x1254透過PNGを利用する。基本猫・野生猫の画像は変更しない。

昼・就寝・起床専用画像は未作成のため、大ねこだけ確定済み「おだやか」「眠そう」「うれしい」を共通フレームで使用する。基本猫・野生猫の専用演出には変更なし。

`npm run test:big-cats` で素材・SQL・4画面幅のUI・Supabase実保存/別ユーザー共有/再読込/所有権/変更制限を検証する。実保存テストの前に本SQLを適用する。
