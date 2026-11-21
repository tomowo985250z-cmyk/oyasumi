# CanBasイベント追加

## 公式X（2026年11月21日確認）

CanBas公式サイト https://www.canbas.co.jp/ の公式SNSリンクから https://twitter.com/canbas4575 （@canbas4575）を特定。現状はリンクのみで投稿を取得・要約・時系列／履歴へ反映しない。既存4情報源の更新・正常データ・通知は変更しない。

公式の自動取得候補はX API v2の `GET /2/users/by/username/:username` と `GET /2/users/:id/tweets`（created_at、text、entities、since_id、ページング）。公式ドキュメントは https://docs.x.com/x-api/posts/timelines/introduction 、認証は https://docs.x.com/fundamentals/authentication/oauth-2-0/bearer-tokens 、料金条件は https://docs.x.com/x-api/getting-started/pricing 。開発者アプリの認証と利用枠が必要。今回の環境では利用可能な認証情報を確認できず、ユーザー照会APIを認証なしで1回実通信した結果はHTTP 401。認証済みの投稿取得・安定性・重複統合は未検証。非公式プロキシ、スクレイピング、ゲストトークン等による取得制限の回避は行わない。

既存CTISのapp.mjs、model.mjs、取得・差分処理、正常データは独立したまま維持。イベント画面は独立モジュール・CSS・データで追加する。データはcanbas/data/events.json、取得状態はevents-status.json。

kringle/は変更せず、日付区分・進捗・段階・時系列分類、公開文字列処理・開示分類・TDnet日付／ページ一覧、ハッシュ・項目差分、Pages完了確認をimportして再利用する。実行時依存は同一リポジトリの静的モジュールのみ。

毎日の既存CanBas workflowでCTIS→イベント取得を実行。CTISは正常取得済みtrial.json/status.jsonを照合し通信を重複しない。CTIS取得失敗時はイベント側でも成功扱いせず以前の正常データ・成功日時を保持する。IR/TDnet/ClinicalTrials.govは個別取得し、失敗した情報源だけ保持する。必須項目・未知の状態・件数・次ページを検査する。

IR配信先は公式サイトのeir.js→app/conf/common_conf.jsで確認したannouncement_15.js。公開一覧は2025年以降、過去取得分を保持。TDnetは初回7日、以後前回成功の前日以降の全ページを取得し、掲載期間経過で消さない。31日以上未取得があれば取得範囲に明記する。ClinicalTrials.govはスポンサーCanBasの検索（100件・次ページがあれば不完全として失敗）。FUJI-PanC01との対応は推定しない。

開示は表題・公表日時・公式リンクのみ自動反映。PDF本文を自動抽出して完了・提携成立とはしない。PDF／公式ページを確認後、events-reviewed.jsonの出典・ページ・確認日・確度・進捗・内容を編集し更新を実行する。部分日付は年／月までの精度を維持。2029年前半は表示ラベルと期間で保持し特定の日を推定しない。

変更は項目別に保存し、国・施設もCTISの公開フィールドから検出。情報源ごとの直近マークは正常な無変更取得や取得失敗で消さず、次の変更時のみ置換。historyは追加保存し全件閲覧可能。初回記録は変更と区別。公式変更日時がない場合は取得確認日時を表示。CTISの国別表示の通知は従来の処理をそのまま使用する。

更新: `node canbas/scripts/update.mjs` のあと `node canbas/events/update.mjs`。手動取得はGitHub ActionsのCanBas workflow_dispatch。無変更ならevents.jsonは書き換えず、最終取得成功／試行はevents-status.jsonだけ更新する。

検証: `node --test canbas/tests/update.test.mjs canbas/events/update.test.mjs`。WebKit: `node canbas/events/browser.cjs`（既存Playwrightを利用、実行時依存なし）。
