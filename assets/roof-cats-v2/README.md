# 屋根上の後ろ姿猫 v2

「今夜まだ起きてる人」の屋根上グループ専用。全16猫種、各1枚、1024×1536 RGBA透過PNG。既存の `assets/cat-refresh-v1/<coat>/morning.png` を毛色・柄・画風の参照にし、三毛猫の後ろ姿を共通ポーズの参照として制作。

- built-in imagegenを使用。1猫種につき1画像の生成。丸枠・背景・影なし。
- 生成元は `output/roof-cats-v2/<coat>-original.png` に保持。
- 既に承認された `output/cat-refresh-v1/AlphaCleanup.cs` で512画素以下の孤立点と外縁3px以内だけを処理。保持画素のRGB・内部alpha変更は0。
- 対応とSHA-256は `manifest.json`。輪郭処理結果は `output/roof-cats-v2/alpha-report.json`。
- 従来の屋根画像と既存208枚はそのまま保持。人数・猫種選択・時間帯・3時間期限は変更しない。
- 2026-10-10: ユーザーが16枚の更新とmainへのcommit・pushを承認。旧画像・既存208枚・DB・表示条件・7日制限関連は維持。