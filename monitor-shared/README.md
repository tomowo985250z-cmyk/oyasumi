# 株価と端末内の保有計算

3社の株価・USD/JPYだけをYahoo Finance公開Chart JSONからActionsで取得し、同一サイトの`data/quotes.json`に保存する。非保証の公開インターフェースのため、項目検証・取得失敗検知を行い、銘柄・為替それぞれで正常価格と成功日時を保持する。毎営業日UTC 00–06時・13–21時の7分・37分に実行（Actionsによる遅延あり）。通常取引価格のスナップショットで、リアルタイム価格ではない。

入力値は銘柄別localStorageだけに保存する。保存キーは`oyasumi:portfolio:v1:<symbol>`。取得単価は3社とも円/株。Jobyの評価額は`USD株価×USD/JPY×株数`、含み損益は`評価額−円建て取得単価×株数`。取得時の円単価との比較なので為替変動も含む。手数料・税金は含まない。株価前日比は原通貨建てで別表示する。

入力変更では通信しない。公開JSON、Actionsログ、Gitに保有入力値を保存しない。ブラウザ保存不可の場合は画面内だけで計算する。消去は該当銘柄のキーだけに作用する。

`node --test monitor-shared/market.test.mjs`で検証。`node monitor-shared/browser.cjs`は既存Playwright WebKit環境を使用する。`node monitor-shared/update.mjs`で公開データを取得する。価格・為替それぞれの時点、最終取得成功日時、試行日時を表示し、取得失敗・再読込失敗・96時間以上未取得の場合は古い参考値と表示する。週末・休場中は価格時点が前営業日のままとなる。
