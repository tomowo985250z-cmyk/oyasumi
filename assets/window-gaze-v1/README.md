# 窓を眺める猫（全16種）

ホームの「外を眺めてる」専用の透過PNGです。既存の猫を参照し、窓の方向（左上）を見る斜め後ろ姿に変更しています。元の `assets/cat-refresh-v1`、屋根の猫、ごはん・おやつの画像は上書きしていません。

- 生成方法：組み込み `image_gen` の編集モード、透過背景。
- 元画像・構図の参照画像・最終プロンプト：`prompts.json`。
- 猫種・ファイル・SHA-256・サイズ：`manifest.json`。
- `DayCats.svg('gaze', coat)` のみがこの画像を使い、昼のこの行動中だけ窓辺に配置します。他の行動・夜の画像・行動スケジュールは従来どおりです。
- 検証：`node test-cat-image-assets.js`、`node test-window-gaze.cjs`（WebKit）、`node test-window-gaze.cjs --edge`。
