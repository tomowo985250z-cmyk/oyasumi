# 一般公開前のセキュリティ・保存点検

点検日：2026-10-17。基点：`origin/main` の `ac2e534`。公開サイトの公開キー、リポジトリ、隔離したブラウザ・SDK・ローカルDBを使用。**本番DB・RLS・認証設定は変更せず、本番の匿名ユーザーも作成していない。一般公開の安全性を全面保証する判定ではない。**

今回、旧版の`oyasumi-v1`が壊れている／読み取れない場合に、正常な`oyasumi-local-v2`まで読み込めず、朝の記録・表示設定・就寝終了の情報を初期値で上書きし得る問題を再現した。2つの読み取りを分離して修正した。すでに上書きされたローカル記録を復元する機能はない。

## 重要度順の残るリスク

| 優先度 | 確認した状態・影響 | 次に必要な対応（今回は未実施） |
| --- | --- | --- |
| 高 | 本番の認証済みユーザー間のRLS・列権限・全RPC定義を再照合できていない。公開キーの未認証GETでは6テーブル・4参照RPCすべて401/42501を確認したが、他人の履歴の取得や直接更新の拒否を証明するものではない。既存のローカルfixtureは本番RLS一式の複製ではなく、基本テーブル・ニックネーム・削除RPCの完全な本番定義もリポジトリにない。 | 管理者が下記の読み取り照合を行い、認証済みA/Bの所有権・過去履歴・リアクション送信者・内部helperの公開範囲を隔離した本番相当環境で検証。差異があればDB/RLS変更案を別途レビューする。 |
| 高 | 匿名セッションを失うと同じアカウントに戻れない。ブラウザのデータ削除、別ブラウザ・機種変更、プライベートブラウズ終了、認証セッションの無効化が契機となる。投稿等はサーバーに残り、所有者としての編集・削除ができなくなる。 | 設定・プライバシー説明を明確化済み。復元自体は未実装。継続利用が要件なら、喪失前の任意の認証連携と、その同意・既存データの扱いを別途設計する。ユーザーID・名前・猫だけでは本人確認できない。トークンのコピーや共有URLを復元策として提供しない。 |
| 高 | 匿名ユーザーもDBでは`authenticated`となる。誰でも参加できるため、そのロールだけで信頼できる利用者とは判定できない。投稿RPCには60秒重複抑制・1分10件制限があるが、新しいアカウントによる回避・大量登録には十分ではない。現フロントはCAPTCHAトークンを渡していない。公開設定APIではCAPTCHAの有効状態を確認できなかった。 | 管理画面でCAPTCHA・認証IP制限・利用量監視を確認し、必要なら不可視CAPTCHA連携を別途提案・承認。確認のために大量サインアップやレート制限への負荷試験はしない。 |
| 高 | バックアップの契約・保管世代・最終成功日時・復元実績が不明。Gitの履歴はSupabaseデータやブラウザ内記録のバックアップにならない。 | 管理者が実際のBackups画面と別保管を確認。復旧時点と停止時間の目標を決め、別プロジェクトでAuthと公開データの整合性を含む復元試験を行う。本番への復元・ダンプ・秘密キー取得は今回行っていない。 |
| 中 | 投稿3時間・06:00境界は画面の表示条件であり、自動削除・非公開化ではない。履歴・給餌記録・最新の猫の状態は保持される。全履歴・アカウントの削除UIや問い合わせ先、保存期間の自動制限は未整備。 | 保管期間、削除依頼の本人確認、運営窓口、匿名IDを失った場合の扱いを決める。既存データの削除・TTL・退会RPCは提案のみとする。 |
| 中 | 名前・ひとこと・〇〇猫・猫・投稿と時刻はほかの参加者に公開される。UUIDは投稿やAPI応答に含まれるため同一ユーザーを結び付けられ、生活時間や職業カテゴリを推測できる。友人限定の共有ではない。画面にない項目もAPIの取得範囲はRLS・列権限で確認が必要。 | 本名・学校・連絡先を書かない既存の説明を維持。必要ならプロフィールの公開列と匿名集計をサーバー側で最小化する案を別途レビューする。取得済みの写しを取り消せるとは約束しない。 |
| 中 | 名前・40文字のひとことはフロントとRPCで検証され、描画はエスケープされる。一方、単語・URL・電話番号の簡易検証では実名・住所・迂回表記をすべて検出できない。通報・ブロック・運営の削除対応UIはない。 | 不適切な入力・個人情報の申告窓口と対応手順を公開前に整える。検証を過信しない。辞書拡張・DBルールの変更は今回していない。 |
| 中 | 認証情報はJavaScriptから読めるlocalStorageにある。XSSや同じ`*.github.io`オリジンの別ページの侵害の影響を受ける。プロジェクトのパスは保存情報の分離境界にならない。CSPは未設定。 | 同一オリジンの他の公開コードも管理し、CSPや専用オリジンを検討する。ドメイン変更も匿名セッションを引き継がないため、復元設計より先に移転しない。 |

## 今回の最小修正

- `app.js`：旧版・現行版の保存情報を独立に読み、片方の破損や読み取りエラーで、もう片方の正常な情報を捨てない。保存キー・形式・現行データの優先順位と既存の保存処理は維持。読み取り時に旧エントリを消去・書き換えない。
- `app.js`：既存の設定説明内でログイン情報の保存先、喪失条件、復元・引き継ぎ未対応、朝の記録の喪失、サーバーデータが残ることを説明。強制ダイアログは追加しない。
- `safety.js`：給餌記録の保存説明を補完。古い06:00だけの説明を現在の3時間表示仕様に合わせ、表示終了とデータ削除を区別。削除できる投稿が表示中のものに限られること、ブラウザ削除とサーバー削除の違いを明確化。
- リリース識別子を更新。猫・背景・仕草・給餌・投稿・認証・初回案内の処理は変更しない。

## 保存と復元の境界

| 情報 | 保存先・利用範囲 | 消失・復元の条件 |
| --- | --- | --- |
| 匿名認証のセッション | このブラウザの同一オリジン、`oyasumi-auth`。SDKのpersistSession・autoRefreshTokenを使用 | 同じ保存情報が有効なら再読み込みで同じIDを再利用する。失うと本アプリでは再ログイン不可。サーバーバックアップを復元してもブラウザの失った認証情報は戻らない。 |
| 朝の記録・表示設定・就寝終了時の情報 | `oyasumi-local-v2`。以前の`oyasumi-v1`は通常利用では保持 | サーバー同期・エクスポート・復元なし。ブラウザ削除・別ブラウザでは引き継がれない。 |
| プロフィール・投稿・リアクション | Supabase。共有プロフィール、投稿・時刻、種類別件数。リアクション送信者名は画面に出さない | 表示期限で自動削除しない。自分の表示中の投稿削除、ひとことの空欄化は可能。アカウント全削除は未実装。本番RLSの詳細は上記の未確認事項。 |
| ごはん・おやつ・猫の最新状態 | Supabase。本人の状態や集計をRPCで返す。移行SQLでは直接アクセスを取り消している | 投稿の削除と猫の状態は独立している。ブラウザ削除でもサーバーの記録は消さない。 |
| ログ・バックアップ | GitHub Pages・Supabaseの運用設定に従う | アプリ内で削除や復元を制御できない。実契約・保持期間・復元実績は管理者確認が必要。 |

## 管理者向けの次の確認（提案、未実行）

追補：[本番設定の読み取り点検・Dashboard手順・A/B所有者確認表](supabase-production-security-readonly.md)と[値・本文を返さない確認SQL](../supabase/security-readonly-inspect.sql)を追加。個人情報・秘密値の共有を避ける今回の管理者確認には、条件式の全文を返す下記の旧SQLより追補のSQLを使用する。本番の認証済み相互権限は引き続き未確認。

以下は前回の一般的な構造確認SQLで、履歴として保持する。既存の`supabase/night-boundary-inspect.sql`・`supabase/cat-care-state-inspect.sql`も条件式や関数本文を返すため、今回の「秘密値・個人情報を取得・表示しない」点検には使用しない。追補のメタデータ専用SQLを使い、所有者条件の詳細は管理者が内部で確認して判定のみを記録する。

```sql
begin read only;
set local statement_timeout = '10s';
select c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.reloptions,
       pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and left(c.relname,8)='oyasumi_'
  and c.relkind in ('r','p','v','m') order by c.relname;
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='public' and left(tablename,8)='oyasumi_'
order by tablename, policyname;
select c.relname, r.rolname, x.privilege,
       has_table_privilege(r.oid,c.oid,x.privilege) as allowed
from pg_class c join pg_namespace n on n.oid=c.relnamespace
cross join pg_roles r cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) x(privilege)
where n.nspname='public' and left(c.relname,8)='oyasumi_'
  and c.relkind in ('r','p','v','m') and r.rolname in ('anon','authenticated')
order by c.relname,r.rolname,x.privilege;
select p.oid::regprocedure::text as signature, p.prosecdef, p.proconfig,
       pg_get_userbyid(p.proowner) as owner,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       md5(pg_get_functiondef(p.oid)) as definition_md5
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and left(p.proname,8)='oyasumi_' and p.prokind='f'
order by signature;
rollback;
```

`anon`への読取拒否だけでなく、匿名ログイン後の`authenticated`での取得可能行・列・書込経路を確認する。SECURITY DEFINERはRLSを迂回し得るため、EXECUTE権限だけでなく`auth.uid()`による所有者制限、空search_path、返す項目も見る。未適用SQLをまとめて実行して状態を合わせない。

## 検証方法と限界

`test-privacy-storage.cjs --width=320`（375/390/430も同様）、`--edge`でEdge、指定なしでWebKit。実際の画面・イベント処理・同梱Supabase SDKを使用し、全APIをインターセプトする。再読み込みでIDを再利用すること、アプリを閉じてブラウザ内情報を削除した後は別IDとなること、別ブラウザ相当の保存領域では独立IDになること、朝の記録の消失を確認する。元のサーバー記録が残る点は隔離モデルと実装の読取から確認しており、本番データを消して試してはいない。

同じ4幅・両テーマで説明の可読性、任意表示、ダイアログのスクロール・閉じる操作、説明参照で既存保存情報を変えないこと、入力拒否・エスケープ・保存失敗後の再試行を検証する。壊れた旧データ／読めない旧データと正常な現行データ、壊れた現行データと正常な旧データの3ケースを、起動後の自動保存まで含めて確認する。`node test-local-storage-read.cjs`は実際の起動時読み取り部分で6ケースを検証し、読み取り自体に書き込みがないことも確認する。

既存の給餌・投稿・保存・初回案内、16猫種×3居場所、認証変更・別IDキャッシュ・保存禁止ケースも隔離して回帰確認する。SQL検証はPGliteのローカルDBのみで実行する。

公開後もリリースと全配信ファイルの一致を確認し、公開画面のブラウザ検証はAPI隔離で実施する。**iPhone実機は未検証。** 本番の認証済み相互権限、実際のブラウザ自動削除タイミング、管理者バックアップからの復元は今回の実測範囲に含まない。

## 参照した公式資料

- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)：匿名セッション喪失、authenticatedロール、濫用防止。
- [Supabase User sessions](https://supabase.com/docs/guides/auth/sessions)：セッションと更新トークン。
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)：アクセス制御、SECURITY DEFINER。
- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)：プランによるバックアップ条件。無料プランは別保管を自分で用意する。実契約は未確認。
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)：同一オリジンでの保存、プライベートブラウズでの消去。
