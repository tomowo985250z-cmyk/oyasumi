# 株価と端末内の保有計算

3社の株価・USD/JPYだけをYahoo Finance公開Chart JSONからActionsで取得し、同一サイトの`data/quotes.json`に保存する。非保証の公開インターフェースのため、項目検証・取得失敗検知を行い、銘柄・為替それぞれで正常価格と成功日時を保持する。月～金の日本時間09:07～15:37・22:07～翌06:37に15分間隔で実行（曜日条件はUTC月～金、Actionsによる遅延あり）。従来の開始・終了時刻を維持し、UTC 06時・21時は52分の実行を追加しない。通常取引価格のスナップショットで、リアルタイム価格ではない。

定期実行はUTC平日1日62回、1回4リクエスト、再試行なし。既存の共有concurrencyと差分保存・公開を維持し、Joby前日比用の対応為替Actionsは変更しない。画面の再読込周期・計算・表示も変更しない。[Yahoo公式の配信遅延案内](https://help.yahoo.com/kb/finance/article-exchanges-data-delays-sln2310.html)では東証は20分遅延とされ、再配布禁止の記載がある。[APIガイドライン](https://legal.yahoo.com/us/en/yahoo/guidelines/ydn/index.html)も確認したが、この公開Chart JSONの保証更新周期・数値の利用上限・この用途の利用許諾は確認できていない。取得間隔の短縮は配信元の遅延解消や利用許諾を意味しない。

入力値は銘柄別localStorageだけに保存する。保存キーは`oyasumi:portfolio:v1:<symbol>`。取得単価は3社とも円/株。Jobyの評価額は`USD株価×USD/JPY×株数`、含み損益は`評価額−円建て取得単価×株数`。取得時の円単価との比較なので為替変動も含む。手数料・税金は含まない。株価前日比は原通貨建てで別表示する。

入力変更では通信しない。公開JSON、Actionsログ、Gitに保有入力値を保存しない。ブラウザ保存不可の場合は画面内だけで計算する。消去は該当銘柄のキーだけに作用する。

`node --test monitor-shared/market.test.mjs`で検証。`node monitor-shared/browser.cjs`は既存Playwright WebKit環境を使用する。`node monitor-shared/update.mjs`で公開データを取得する。価格・為替それぞれの時点、最終取得成功日時、試行日時を表示し、取得失敗・再読込失敗・96時間以上未取得の場合は古い参考値と表示する。週末・休場中は価格時点が前営業日のままとなる。
