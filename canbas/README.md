# CanBas 治験モニター

FUJI-PanC01（EU CT番号 `2024-511500-16-01`）の独立した静的ページ。
既存のおやすみのHTML・CSS・JavaScript・音楽・公開元の設定は使用・変更しない。
施設名と住所は正式なCTIS掲載表記を保持し、日本語の画面説明・状態訳と区別する。

## 情報源と判定

- 公式詳細JSON：`https://euclinicaltrials.eu/ctis-public-api/retrieve/2024-511500-16-01`
- 公式検索：`POST https://euclinicaltrials.eu/ctis-public-api/search`。`searchCriteria.number`で対象番号のみを照会。
- 治験名・番号・プロトコル・スポンサーを照合。国別の状態は`mscInfo`を使い、申請全体の状態を各国の承認に流用しない。
- 承認済みの詳細は`authorizedPartsII`、審査中の国は`applicationInfo.partIIInfo`。8カ国の欠落、両APIの公開参加国・状態の不一致、未対応の状態、必須項目の欠落は失敗扱い。
- 募集開始・終了は`hasRecruitmentStarted`と`activeTrialRecruitmentPeriod.recruitmentStartDate/recruitmentEndDate`を照合する。予定日を実際の募集開始に流用しない。
- 公開された`trialSites`だけを数える。施設一覧が未公開の国は`null`とし、0施設と区別する。施設別の募集状況は推定しない。
- 情報更新日は検索の`lastUpdated`、公開日は`lastPublicationUpdate`。CTISの暦日として保持し、取得日時（日本時間表示）と混同しない。
- 個人の連絡先、担当医名、製品内部情報、PDFは公開データに取り込まない。

## 更新・失敗・差分

`node canbas/scripts/update.mjs`で取得する。外部パッケージやAPIキーは不要。

`data/trial.json`は正規化した公式情報と前回差分を保存し、内容が変わった場合だけ書き換える。
配列の順番やCTISの内部ID変更は差分にしない。同数の施設でも名称・住所の変更は検知する。
初回取得は「比較対象なし」と表示する。変更のない次回取得で、過去の差分を今回の変更として再表示しない。

`data/status.json`は小さな取得管理情報。試行日時と最終成功日時を分離して毎回記録する。
通信・HTTP・JSON・必須項目のエラー時は`trial.json`と最終成功日時を保持し、失敗表示だけ更新する。
状態ファイル欠落やハッシュ不一致、36時間超の未取得も画面で明示する。

## GitHub ActionsとPages

`.github/workflows/canbas-monitor.yml`で毎日13:17ごろ（日本時間）と手動実行に対応。
GitHub上のActionsから「CanBas 治験モニター更新」→「Run workflow」→`main`を選択する。
定期実行時刻はGitHubの処理状況により遅れる場合がある。

取得前に保持・差分・スキーマ判定をテスト。書き込みは上記2ファイルに限定する。
取得失敗時も失敗状態を公開するが、ジョブ自体は失敗として記録する。
`GITHUB_TOKEN`のコミットでPagesが自動再構築されない点に対応し、PagesのビルドAPIを明示的に呼ぶ。
既存設定（`main`直下・`legacy`）を確認し、正しいコミットの公開完了まで検証する。
Pagesの設定が変わっていた場合は自動変更せず停止する。追加の秘密鍵やPATは不要。

ページには`robots`と`googlebot`の`noindex,nofollow,noarchive`を設定する。
ルートのrobots.txtやおやすみの画面へのリンクは追加しない。

## テスト

```sh
node --test canbas/tests/update.test.mjs
node canbas/tests/browser.cjs
```

ブラウザーテストは開発用のPlaywright WebKitを使用する。インストール先は
`OYASUMI_PLAYWRIGHT`で指定できる。アプリの実行時依存ではなく、毎日の取得にも不要。
375/390/1024px、施設一覧展開、再読込、変更強調、取得失敗、古い情報、項目欠落、取得状態不一致、原文の安全な表示を検証する。
`tests/fixtures/source.json`は2026-11-21取得の公式データから、検証に必要な公開項目だけを残したもの。
試験用の状態変更はテスト内のみで生成し、実データと混ぜない。
