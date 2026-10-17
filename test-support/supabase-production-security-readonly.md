# Supabase本番設定の読み取り点検と管理者手順

点検日：2026-10-17。基点：`origin/main` の `f5d567f`。[前回の点検](security-privacy-audit.md)の続き。アプリ・DB・RLS・認証設定は変更しない。

## 結果と確認範囲

| 項目 | 状態 | 根拠・限界 |
| --- | --- | --- |
| 匿名認証 | **公開設定上は有効** | 2026-10-17 00:33 UTC（09:33 JST）の`GET /auth/v1/settings`。公開の真偽値だけを記録。サインアップ・セッション取得はしていない。 |
| 未認証のテーブル入口 | **6テーブルとも401** | `profiles / posts / reactions / cat_meals / cat_treats / cat_post_states`（すべて`oyasumi_`接頭辞）へHEAD・limit=0、本文・件数取得なし。RLS有効化や認証後のA/B分離を証明しない。 |
| 未認証の参照RPC拒否 | **前回の観測を参照** | 前回4RPCが401/42501。今回はRPCを一切呼んでいない。現在のEXECUTE権限は未確認。 |
| RLS、テーブル・列権限、ビュー、RPC権限・所有者条件 | **本番は未確認** | 利用可能なツールに本番管理者接続はなく、Dashboardにもログインしていない。カタログ出力未受領。リポジトリのSQLは現在の本番状態の証明にしない。 |
| CAPTCHA・認証レート制限 | **未確認** | 公開設定では有効状態・実際の制限値を取得できない。アプリの匿名認証呼出しにCAPTCHA連携はない。これだけでサーバー側設定を推定しない。 |
| バックアップ・PITR・保持期間・復元実績 | **未確認** | 実契約・管理画面・運用記録にアクセスしていない。Gitの履歴やアプリのrelease.jsonはDBバックアップの証明にならない。 |
| ユーザーAによるBの非公開情報の取得・変更拒否 | **本番は未検証** | 本番のA/Bユーザー作成、既存トークン利用、本人以外のデータ取得、書込試験はしていない。未確認を「安全」と判定しない。 |

秘密キー・認証トークン・個人の行は取得・表示していない。HTTPは公開設定1回と本文を返さないHEAD6回のみ。本番SQL実行、RPC実行、認証作成、書き込み、設定変更は0回。前回のブラウザ・ローカルDB試験は繰り返さず、今回の確認SQLだけを合成データのローカルPostgreSQLで検証した。

## 重要度順の問題と対策案

1. **高：本番のA/B分離を証明できていない。** RLSが有効でも、列権限・緩い別ポリシー・SECURITY DEFINER・既定のビュー所有者権限・旧RPCから迂回できる場合がある。下記SQLと所有者条件の確認を公開前の必須確認とする。欠陥が確認された場合だけ、該当権限・ポリシー・RPCの限定した変更案を別途レビューする。未適用SQLの一括実行や一律の権限取消はしない。
2. **高：濫用防止の本番設定が不明。** CAPTCHA、匿名登録のIP制限、投稿RPCの制限は別の対策。アプリにはCAPTCHA連携がないため、将来有効化する場合は先に隔離環境で連携案を検証する。今回は有効化・閾値変更・負荷試験をしない。
3. **高：復旧できるバックアップの実在・復元実績が不明。** 保持範囲、最終成功、許容するデータ損失時間・停止時間を管理者が確認する。別環境での復元試験は将来の別作業。本番でRestore・ダンプ・バックアップ作成は実行しない。匿名アカウントのブラウザ内ログイン情報は、DB復元では戻らない。
4. **中：設定確認だけでは今後の権限拡大を防げない。** 公開スキーマ、PUBLIC由来の権限、作成者ごとの既定ACL、旧RPC・内部helperの公開も継続確認する。将来の既定権限変更は新規関数の生成元も含めて設計し、既存機能を壊さない変更案として扱う。

## Dashboardで管理者が確認する画面

対象はリポジトリの公開URLに対応する本番プロジェクト。プロジェクト名だけで選ばず、公開URLの参照先と照合する。画面名称はUIの版によって異なるため、下記の公式資料も参照する。**値を読むだけにし、Save・Apply・Enable・修正・Restore・Downloadを押さない。** API Keys、JWT Secret、接続パスワード、AuthenticationのUsers、個別ログ、Table Editorのデータ行は開かない。画面全体のスクリーンショットも不要。

| 画面 | 読み取り手順・控える項目 | 判断の注意 |
| --- | --- | --- |
| Advisors → Security Advisor | 現在の警告を表示し、RLS未設定、公開ビュー、可変search_pathなどの種類と対象オブジェクト名だけを確認。自動修正は使わない。 | 警告0件でもA/B分離の合格ではない。 |
| Project Settings → Data API → Exposed schemas | 公開スキーマの名前だけを確認。鍵の表示・コピーはしない。 | 付属SQLは`public`の拡張機能に属さないオブジェクトが対象。他スキーマや拡張機能の公開があれば別途確認が必要。 |
| SQL Editor → New query | [確認SQL](../supabase/security-readonly-inspect.sql)を全文実行し、`security_metadata`のJSONだけを確認。 | 読取専用トランザクション内のカタログ参照のみ。本番ではまだ実行していない。 |
| Authentication → Sign In / Providers | 匿名サインインと新規登録の許可状態を読む。 | 匿名ユーザーも`authenticated`ロール。恒久アカウントと同じロールだから信頼できる、とは判定しない。 |
| Authentication → Attack Protection（またはSettings → Authentication → Bot and Abuse Protection） | CAPTCHAの有効状態とプロバイダー名だけを読む。秘密値の入力欄や表示操作には触れない。 | 公開設定の欠落を「無効」と解釈しない。連携なしで有効にすると新規利用を妨げ得る。 |
| Authentication → Rate Limits | 匿名サインインのIP制限値・単位、関連する認証制限を読む。 | 公式既定値は実際の本番設定ではない。10回/分などのアプリ投稿制限とは別。サインアップや429到達の実験はしない。 |
| Database → Backups → Scheduled backups / Point in Time | 日次バックアップの利用可否、直近の成功時刻、保持範囲、PITRの有効状態・復旧可能範囲を読む。別保管と復元実績は運用記録で確認。 | 契約プランを推測しない。バックアップ本文・ダンプ・Storageオブジェクトは取得しない。復元時点以降のデータ損失や停止時間は別途検討する。 |

SQLが権限不足・タイムアウトになった場合は、エラー種別だけを記録して中止する。権限昇格、書込可能モードへの変更、秘密キー取得で回避しない。エラー後は同じ接続のSQL Editorで`ROLLBACK;`だけを実行すれば、そのトランザクションを終了できる。

## 読み取りSQLの出力の見方

[security-readonly-inspect.sql](../supabase/security-readonly-inspect.sql)は**確認資料であり移行SQLではない**。RLSや権限を直す文は含まない。既存のinspect SQLと異なり、ポリシー条件・関数本文・引数既定値・独自所有者ロール名を出力しない。DB内で定義をハッシュ化し、真偽値の補助情報だけを返す。カタログ上の技術的オブジェクト名は含む。実ユーザーのUUID、投稿・名前、認証情報、ログ、アプリ行の件数は取得しない。

`SET LOCAL`は当該トランザクションだけの検索パス・タイムアウトの安全策で、プロジェクトの永続設定を変更しない。終了時の`ROLLBACK`で元に戻る。アプリのテーブルやRPCは参照・呼出ししない。

- `transaction_read_only`が`on`、`format`が`oyasumi-security-metadata-v1`であることを確認する。`verdict`は必ず`REVIEW_REQUIRED`で、安全判定は生成しない。
- `missing_tables`・`missing_routines`が空でない、または`roles`が2件ない場合は、対象・権限・定義の不一致として未確認を残す。存在しないものをその場で作らない。
- `relations`：APIで使うテーブル・パーティションのRLS、所有者の迂回権限を確認する。所有者・BYPASSRLS・superuserでのSELECT成功は一般利用者の検証ではない。`v`はビュー、`m`はマテリアライズドビューで、テーブルのRLSだけでは公開範囲を説明できない。
- `table_permissions`・`column_permissions`：PUBLICや継承ロールを含む実効権限。テーブルのSELECTがfalseでも、特定列のSELECTがtrueなら取得経路がある。本人だけの給餌状態・リアクション送信者・猫の変更履歴などが直接公開されていないか確認する。直接INSERT/UPDATE/DELETE等が許可される場合は、RPCの本人検証を迂回し得るため要確認。
- `policies`：PUBLIC／anon／authenticatedへの適用、PERMISSIVEとRESTRICTIVE、USINGとWITH CHECKを確認。PERMISSIVEが複数あるとORで広がる。`using_literal_true`は共有プロフィール等では意図的な場合がある。UPDATEの所有者条件と新しい行の所有者を保つ条件を別々に見る。WITH CHECKの省略にはUSINGの代用等の意味があり、nullだけで欠陥と決めない。
- `routines`：PUBLIC・anon・authenticatedの実効EXECUTE、SECURITY DEFINER、固定search_path、所有者の迂回能力を見る。EXECUTEが認証済みだけでも、返す行・更新対象が本人に限定されるとは限らない。`definition_mentions_auth_uid`はコメント中の文字列でもtrueになり得る補助情報で、存在は合格証明ではない。安全なhelperに委譲する関数ではfalseでも正当な場合がある。定義ハッシュの一致も、安全性自体の証明にはならない。
- `view_dependencies`：公開ビューが非公開テーブルやauthスキーマへつながっていないか確認。`view_security_invoker=false`のビューやマテリアライズドビューで機微な内容を返していないか、管理者が内部で定義を確認する。本文・固定値は共有しない。
- `schema_permissions`・`explicit_default_acl`：クライアントのCREATE権限や今後の関数へのPUBLIC EXECUTEを確認。既定ACLの行が空でも「新規関数は実行不可」とは限らない。ここで示す既定ACLはPUBLIC・anon・authenticatedへの明示分で、作成者・他の継承元・他スキーマも別途確認する。

条件式の全文を返さないため、これだけで所有者制限の正しさを確定できない。管理者は実データを表示せずに、現行定義の対象行条件・返す項目・委譲先を内部で確認し、次の表の判定だけを記録する。固定の秘密値・実ユーザーID・関数本文をチャットや公開Gitへ貼らない。カタログJSONも自動でリポジトリに追加しない。

## A/B分離とRPC所有者条件の確認表

匿名登録後のA/Bはいずれも`authenticated`。共有してよい項目と、B本人だけが取得・変更できる項目を区別する。**本番ではA/B作成・既存トークン取得・なりすまし・実データ読取・書込試験を行わない。UPDATEしてROLLBACKする試験も禁止。** 動的な拒否の確認は、将来、実データや本番バックアップを入れない別環境で合成A/Bを用意する別作業とする。

| 経路 | 管理者が定義で確認する条件・期待 | 今回の状態 |
| --- | --- | --- |
| プロフィール・投稿のSELECT | Aが見られる共有項目と対象期間を明示。Bの過去夜の私的履歴や追加の非公開列に取得経路がない。3時間の画面非表示をDBの非公開化とは扱わない。 | 本番未確認 |
| テーブル・ビューの直接書込 | AがBのuser_id・プロフィール・投稿・給餌状態を変更できず、所有者の付け替えや別経路でのRPC検証回避もできない。列単位の書込権限も見る。 | 本番未確認 |
| `oyasumi_set_nickname / set_profile_note / set_cat_*` | 本人はサーバーが検証する`auth.uid()`から求め、引数や編集可能なメタデータのIDを本人として信用しない。対象プロフィールが本人に限定される。 | 本番未確認 |
| `oyasumi_submit_post / submit_post_v2` | 投稿者は本人。新規・重複・再試行の全経路でBの行を返したり更新したりしない。所有者検証と連投制限の両方を確認する。 | 本番未確認 |
| `oyasumi_delete_post` | 投稿IDを指定しても削除対象は`user_id=auth.uid()`に限定。Bの投稿を消せない。現在の本番本文はリポジトリにない。 | 本番未確認 |
| `oyasumi_set_reaction / _v2 / _v3` | 公開対象のB投稿へAが反応することは意図した操作。変更・取消するリアクション行はAのものだけ。Bや別人のリアクションを変更しない。旧RPCからの迂回もない。 | 本番未確認 |
| `oyasumi_reaction_counts* / morning_reactions* / sent_reaction_people` | 公開の種類別件数とA自身の選択以外に、Bの送信先・送信者一覧を返さない。本人向けの朝の集計・送信人数はA本人のものに限定。 | 本番未確認 |
| `oyasumi_cat_care_status / give_cat_meal` | A本人の状態だけを返し、食事の更新もA本人。Bの状態・日別履歴・送信先を返したり更新したりしない。 | 本番未確認 |
| `oyasumi_give_cat_treat` | AからBへのおやつとBの受取集計の増加は意図した共有機能。giverはA、recipientは許されたB、消費する回数はA。応答がBの非公開履歴を含まず、Bの投稿・設定・本人用ごはんを変更しない。 | 本番未確認 |
| 内部helper | `cat_care_status_at / cat_post_choice_at / cat_is_sleeping_at`と状態捕捉・ロック用trigger関数等をクライアントから直接呼べない。純粋な日付関数など、意図的に公開するhelperとは区別する。 | 本番未確認 |

SQLのauth.uid参照・所有者フラグやローカルfixtureだけで、この表を合格にしない。管理者の内部確認後も動的なA/B拒否は未実測として残し、両者を別々に記録する。

## 管理者の記録欄（値・個人情報の貼付け不要）

| 項目 | 記録 |
| --- | --- |
| 確認日時・対象プロジェクト照合 | 未確認 |
| Security Advisorの該当警告 | 未確認 |
| Exposed schemasに想定外のスキーマなし | 未確認 |
| カタログ検査／上記の所有者条件の内部確認 | 未確認／未確認 |
| 隔離した合成A/Bの動的検証 | 未実施（別作業） |
| 匿名サインイン／CAPTCHAプロバイダー | 公開設定で有効／CAPTCHA未確認 |
| 匿名登録IP制限の値・単位 | 未確認 |
| バックアップ最終成功・保持範囲・PITR | 未確認 |
| 別保管・別環境での復元実績 | 未確認 |

## 公式資料・ローカル検証

- [認証の設定項目](https://supabase.com/docs/guides/auth/general-configuration)、[CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha)、[レート制限](https://supabase.com/docs/guides/auth/rate-limits)。既定値を本番の観測値として使わない。
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)、[関数の安全性とEXECUTE](https://supabase.com/docs/guides/database/functions)、[Advisors](https://supabase.com/docs/guides/observability/advisors)。
- [バックアップ](https://supabase.com/docs/guides/platform/backups)。有料日次バックアップ・PITRの可否や無料プランの別保管について、実契約と管理画面を照合する。

再現コマンド：`node test-support/verify-security-readonly.cjs`（PGliteが必要）。合成DBで、カタログ以外の参照・変更文がないこと、読取専用トランザクション、個人値・関数本文・既定値の非出力、継承された列権限、PUBLIC EXECUTE、非公開helper、ビュー依存、既存合成データの不変を確認する。**合格は確認SQLの検証結果であり、本番セキュリティの合格ではない。**
