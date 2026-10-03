# 公開時のキャッシュ更新

CSS・JS・SVG・HTMLを変更した後、commit前に `npm run release` を実行します。
各ファイルの内容ハッシュをURLに付け、`index.html` と `release.json` を一緒にcommit/pushします。
`npm run check` は内容とURL・公開バージョンの整合性も確認します。

起動・復帰（pageshow、visibilitychange、focus）・オンライン復帰時に公開バージョンを確認します。
最新版のHTMLと公開バージョンが一致する場合だけ、キャッシュ回避用URLで読み直します。
保存・ダイアログ入力・就寝演出中は待機し、通信失敗や公開途中のファイル不一致では現在の画面を維持します。
localStorage、匿名認証、Supabaseデータ、ブラウザキャッシュの全削除は行いません。

GitHub PagesのHTMLレスポンスには `Cache-Control: max-age=600` が設定されています。
この仕組みが入る以前の画面には更新チェックがないため、最初の切り替えは最新版HTMLの読み込みが必要です。
ホーム画面のアイコンから再開したままの古い画面まで、公開側から強制更新することはできません。

WebKitテスト：PlaywrightとWebKitを用意し、`node test-cache-update.js` を実行します。
一時フォルダ等にPlaywrightを配置した場合は `OYASUMI_PLAYWRIGHT` でモジュールパスを指定できます。
通常ブラウザと `navigator.standalone` を模擬したモードで検証します。実iPhoneのSafari／ホーム画面版の実機テストとは異なります。
