# ごはん・おやつ 本番適用の準備

状態：**準備のみ。今回はSQLを実行しない。commit・push・公開もしない。**
本番DBの実スキーマ・権限・データは今回未照会。以下の事前・事後確認は、別途承認後に実施する。

## 適用するファイル

| ファイル | 用途 |
| --- | --- |
| `supabase/cat-care.sql` | 本番に適用する唯一の変更SQL。BEGIN〜COMMITを含むので全文を1回実行する |
| `supabase/cat-care-inspect.sql` | 適用前後の読み取り専用確認。書き込みRPCは呼ばない |

`cat-coat-cooldown.sql`、`cat-coat-cooldown-restore-seven-days.sql`、`night-boundary-six.sql` など既存SQLは今回の適用対象に含めない。**7日制限は解除（paused=true）のまま維持する。**

## SQLの内容と既存データへの影響

- 新規テーブル2つ：`oyasumi_cat_meals` と `oyasumi_cat_treats`。初回は空で作成する。過去の投稿からの自動付与・バックフィルはしない。
- 新規RPC3つ：`oyasumi_cat_care_status()`、`oyasumi_give_cat_meal()`、`oyasumi_give_cat_treat(uuid)`。
- おやつの受取先・日付の索引を新規作成。新規テーブルのRLSと権限を設定。PostgRESTへスキーマ再読込を通知。
- 既存プロフィール・投稿は参照のみ。既存の行のINSERT/UPDATE/DELETE、既存テーブルのALTER、既存トリガー・関数の置換、画像変更は含まない。
- 当日の既存おやすみ投稿もごはんの条件になる。既存の夜の区切り（6時）には触れず、この機能のみ日本時間の暦日（0時〜翌0時）を使う。
- 日別記録は全日付を保持。画面には受取記録がある直近30日分と今日・累計を表示する。
- プロフィール削除に連動する外部キーやCASCADEは作成しない。削除等で既存のおやつ累計が消えない構成。アカウント削除時の管理上のデータ削除方針とは別扱い。
- 全文はトランザクション内で適用する。途中でエラーになればCOMMITせず、エラーを確認する。部分選択で実行しない。
- 同じ版の再適用でデータを削除しない。ただし `IF NOT EXISTS` は既存の同名オブジェクトの形までは検証しないため、初回に同名オブジェクトがあった場合は適用を止め、定義を照合する。

## 権限・匿名性

- 新規テーブルはRLS有効、クライアント用ポリシーなし。PUBLIC・anon・authenticatedの全テーブル権限を明示的に取り消す。
- 新規RPCはPUBLIC・anonの実行権限を取り消し、authenticatedにのみクライアント向け実行権限を付与。Supabaseの匿名サインイン済みユーザーもauthenticatedであり、未サインインのanonとは区別する。
- 全RPCで `auth.uid()` がNULLなら拒否。書き込みRPCは送り主を引数から受け取らず、認証UIDを使う。両者の猫プロフィールを検査し、自分へのおやつを拒否。
- `SECURITY DEFINER` で privateなテーブル操作を仲介し、`search_path=''` とテーブル名のスキーマ修飾を使用。SQL Editorでは管理者（postgres）の通常コンテキストで適用し、anon/authenticatedへ切り替えた状態で作成しない。
- 状態RPCは本人の受取件数・日別集計と本人の送信済みフラグのみ返す。他人の受取集計を指定する引数も、送り主ID・名前を返す列もない。
- 重複防止のためDB内部には贈り主UUIDを保持する。**画面・クライアントに贈り主を公開しない意味での匿名記録**であり、DB管理者にも特定できない不可逆匿名化ではない。管理者・service_role等の管理権限は別扱い。ブラウザへservice_roleキーを渡さない。

権限設計は [Supabase Database Functions](https://supabase.com/docs/guides/database/functions) と [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) の説明と照合済み。

## 重複防止・条件

| 操作 | 条件・DB制約 |
| --- | --- |
| ごはん | 本人が当日 `sleep` / `try-sleep` / `early-sleep` を投稿。連続投稿日数を参照しない。主キー `(user_id, care_date)` で1日1回 |
| おやつ | 他人の猫へ、贈る側が1日合計1回。主キー `(giver_id, care_date)` に受取先を含めないため、別の猫に変えても追加送信不可。CHECKで自分宛を拒否 |
| 同時送信・再試行 | 認証UID単位のトランザクションadvisory lockと `INSERT ... ON CONFLICT DO NOTHING` を併用。初回だけ `accepted=true`、重複は `accepted=false` |
| 日付 | ブラウザの日付でなくDBの `clock_timestamp()` を日本時間に変換。ロック取得後に日付を確定する |

残高消費・ランキング・ペナルティは追加しない。制約による重複防止は [PostgreSQLのON CONFLICTの説明](https://www.postgresql.org/docs/current/transaction-iso.html) と照合済み。

## 承認後の適用順序

1. 対象Supabaseプロジェクトを確認し、既存のDBバックアップを確保する。今回はここから先も未実施。
2. SQL Editorの新規クエリで `cat-care-inspect.sql` を全文実行し、結果を保存する。必要な5列・認証ロール・`auth.uid()` の存在、`paused=true` を確認。初回は新規2テーブル・3関数の結果が0件であることを確認する。必要な型はuser_id=uuid、cat_coat/choice=text互換、created_at=timestamptz。
3. 別クエリで **`cat-care.sql` 全文のみ** を実行する。対象範囲を広げて既存SQLを一括実行しない。
4. `cat-care-inspect.sql` を再実行する。2テーブルのRLS=true、クライアント権限すべてfalse、ポリシー0件、主キー・自己送信CHECKを確認。3つのRPCがSECURITY DEFINER・空search_path・anon実行不可・authenticated実行可であることを確認する。余分な同名オーバーロードがないことも確認する。
5. 既存データ件数と `paused=true` を適用前の結果と照合する。通常の投稿による件数増加は別途考慮する。このSQLが既存行を書き換えることはない。
6. 新しいフロントエンドはSQL成功・事後確認の後に、別途承認されたcommit・push・公開手順で反映する。SQLのみ先行しても旧画面は新規RPCを呼ばず、そのまま動作する。
7. 公開後の動作確認も別途承認範囲内で行う。実アプリで当日おやすみ後のごはん1回、おやつ合計1回、別受取先への追加不可、受取側の匿名集計、0時切替、16猫種のアニメーション、既存投稿・丸アイコン・7日制限解除を確認する。書き込み確認は実際の当日枠を使うため、検証用アカウントを使用する。

SQL Editorの管理者コンテキストで書き込みRPCを直接呼んでも通常は `auth.uid()` がNULLで拒否される。検証目的で本番の認証を偽装したり、本番のclock関数・本番データを操作して日付を進めたりしない。日付境界と同時送信の再現試験は隔離ローカルDBで行う。

## 不具合時の扱い

SQL適用前後の確認に問題があればフロント公開を止める。途中エラーはトランザクションの失敗内容を確認し、別のSQLを追加実行して進めない。

公開後に止める場合は旧フロントへ戻し、新規テーブルの記録を保持する。ブラウザからの追加操作も止める必要がある場合は、別途承認を受けて新規3RPCのauthenticated実行権限だけを取り消す。DBテーブル削除・記録削除・既存テーブルや7日制限設定の巻き戻しは不要。本資料には自動実行される停止SQLを含めない。

## 確認済み範囲

前回の隔離ローカル検証：追加SQLの再適用・権限拒否・認証・全睡眠投稿条件・同時/重複送信・日本時間0時前後・日別/累計匿名集計が成功。実画面128ケース/384アニメーション段階と既存表示768ケースも成功。

今回：SQL全文と既存SQLの依存関係を静的確認し、適用ファイル・読取確認SQL・この手順を準備。**SQL実行はローカルを含めて行っていない。本番実DBの適合確認と本番動作確認は未実施。**
