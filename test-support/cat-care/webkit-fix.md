# 食事アニメーションのWebKit対策

2026-10-10。変更対象はクライアントの描画と検証のみ。

- 食事中の `.care-munch` がサイズのないインライン要素だったため、絶対配置の画像を包む176×170pxのブロックに変更。WebKitのインライン親と絶対配置子の透明度描画問題に依存しない構造にする。参考: https://bugs.webkit.org/show_bug.cgi?id=287407 。この既知問題が利用者の実機での唯一の原因であるとは断定しない。
- 新規DOMへの挿入直後に再生クラスを付けず、画像decode、初期レイアウト、次フレームの順に待つ。decode未対応時は画像のload/errorを待つ。
- 非同期の共有データ更新は `renderPreservingPosition` / `refreshCareCards` を通じて再生DOMを破棄し得た。再生中のカードはコントロールと履歴だけを更新し、シーンは取り外さない。全体の自動描画は約3秒後まで延期。ユーザーによる画面移動は即時。
- 休憩画面の落ち着くタイマーでもDOMが破棄されることをWebKitで再現。同じ自動描画保護を適用。
- Service Worker / Cache Storageは現在使っていない。既存のJS/CSSコンテンツハッシュとrelease.jsonを更新し、旧キャッシュからの更新経路を維持。画像そのものやそのURLの変更は不要。

検証サーバー: `node test-support/cat-care/serve.cjs`。本番DBへ接続しないメモリ内PGliteを利用。DBのresetを使うため、EdgeとWebKitの食事テストは同時に実行しない。

```
node test-cat-care-browser.cjs
# OYASUMI_PLAYWRIGHT にインストール済み playwright / playwright-core のパスを指定可能
node test-cat-care-webkit.cjs
# 休憩画面タイマー修正後の対象経路の再検証
node test-cat-care-webkit.cjs --rest-only
# CACHE_FIXTURE_ONLY=1 で本番接続なしのキャッシュ更新検証
node test-cache-update.js
node test-cat-care-sql.cjs
node test-cat-image-assets.js
node test-cat-coat-cooldown.js
node test-cat-coat-unlock-sql.cjs
node prepare-release.js --check
```

WebKitテストは16猫種×ごはん/おやつ×320/375/390/430px×ブラウザー/standalone模擬。画像ロード、食器/食事中/喜びの3段階、再生中の自動更新によるAnimationオブジェクトの維持を検証。スクリーンショットとJSONは `output/cat-care-webkit/`。動きを減らす設定、decode未対応、休憩画面も検証する。

Windows版Playwright WebKitでの検証であり、iPhone実機Safariやホーム画面へインストールしたiOS PWAの検証ではない。standaloneはnavigator.standaloneの模擬。

最終WebKit検証結果: 256ケース・768段階すべてPASS。通常ブラウザー/standalone模擬の双方で、休憩画面・decode未対応・動きを減らす設定もPASS。キャッシュ専用テストは8条件すべてPASS（新JS/CSS、復帰、配信途中・オフライン・編集中の更新保留、localStorage維持、更新ループ防止）。

元の画像224ファイルのハッシュとマッピング、DBの既存制約、7日制限一時解除を既存テストで確認する。本番DBへのSQL実行は不要。作業開始時からある `supabase/night-boundary-six.sql` 等の変更はこの修正に含めない。
