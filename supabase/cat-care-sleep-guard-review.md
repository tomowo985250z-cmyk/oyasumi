# 猫のごはん画面・就寝中の給餌制限

SQL適用とmainへのpushはユーザー確認待ち。`cat-care-sleep-guard.sql` は未適用。

ホームの猫から「猫のごはん」を開き、既存のカリカリ・現在の時間帯の残り回数・給餌操作・届いたおやつを表示する。ホームの給餌操作と残り回数は撤去。食事演出は専用画面の部屋内で既存の6秒処理を使う。

リポジトリ内の現行 `cat-care-two-windows.sql` の給餌RPCには、就寝中の拒否判定がない。このためUIの無効化に加え、サーバー側にも変更が必要。本番関数定義の管理者権限での取得・本番への書き込み試験は行っていない。

## 確認対象のSQL

`cat-care-sleep-guard.sql` の変更内容:

- 認証ユーザーの当日06:00以降の最新投稿を `event_order` 順で判定する内部関数を追加。`sleep` / `try-sleep` / `early-sleep` を就寝中とする。投稿が3時間で一覧から消えても判定を維持し、翌06:00で解除する。最新が `awake` なら解除する。
- care statusに `mealSleeping` を追加。猫未選択の判定、既存回数、履歴集計は維持する。
- 給餌RPCに投稿と同じ本人ロックを追加し、その後既存のcareロックを取得。就寝中は `P0042` で拒否し、ごはん行を挿入しない。
- 既存の朝06:00〜12:00・昼12:00〜翌06:00の各1回、主キーと重複防止、他人へのおやつRPC、テーブル・行・画像・猫種変更制限は変更しない。
- 内部関数はクライアントに公開しない。公開RPCは引き続き認証必須。

前提は `cat-care-two-windows.sql` と、既存投稿の `event_order` 列。SQL Editorで現行関数を確認する場合:

```sql
select proname, pg_get_functiondef(oid)
from pg_proc
where pronamespace='public'::regnamespace
and proname in ('oyasumi_give_cat_meal','oyasumi_cat_care_status_at','oyasumi_submit_post_v2');
```

確認後に `cat-care-sleep-guard.sql` 全文を1トランザクションで適用する。適用完了を確認してからフロントのmain pushを再開する。

## ローカルでの検証

- `node test-cat-care-sleep-guard-sql.cjs`: 3種類の就寝、同時刻の最新起床投稿、3時間・深夜・06:00・12:00、拒否時の保存ゼロ、重複防止、内部関数の権限、再適用。
- `node test-cat-care-two-windows-sql.cjs`: 既存回数、旧履歴、おやつの2匹制限、権限。
- `node test-home-cat-care.cjs` と `--edge`: WebKit / Edge、320・375・390・430px、昼夜・テーマ、既存16種と食事3段階、6秒再生、画面移動、就寝中の拒否、境界、保存失敗、二重給餌、動きを減らす設定。

これらは隔離したローカルDB・API fixtureで実施し、本番SQL適用後の検証とは区別する。

2026-10-12の結果: 上記SQL試験とWebKit / Edgeの最終一式は合格。各ブラウザーで72条件の時刻・テーマ・幅、16種×4幅×3食事段階、就寝中の4幅×明暗表示を確認。投稿・リアクション・集計の既存ブラウザー試験も両方合格。画像のハッシュ検査、sleep-flow / night-clock、リリース整合性も合格した。

`test-profile-post-cat.cjs` は既存のHTML文字列比較で不一致になったため、追加で変更前HEADと今回の実表示を192条件で直接比較した。相手プロフィールの画像URL・姿・位置・寸法、18:00同期、横はみ出しは変更前と一致した。旧試験自体を合格扱いにはしていない。

詳細は `output/cat-meal-screen/{webkit,edge}/report.json`、同ディレクトリのホーム・給餌・就寝スクリーンショット、および `output/cat-meal-screen/profile-comparison.json` を参照。
