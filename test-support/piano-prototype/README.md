# ジムノペディ第1番 — ピアノ試作

既存5曲のうち1曲だけを比較ページに追加します。オルゴール音源・カタログ・本編プレーヤー・音量設定は変更しません。入口は既存の出典ページの比較試聴リンクです。

音源はAlexander HolmのSalamander Grand Piano（Tone.js配布版）、CC BY 3.0です。著作者・配布元・ライセンス・加工内容を `assets/piano-prototype-v1/LICENSE.txt` に記載します。完成録音もCC BY 3.0で配布します。必要な13サンプルだけ制作時に取得し、音源ライブラリーや中間WAVは配信しません。

元の入力譜はErik Satie / Evin Robertson / Mutopia、Public Domain。既存の滑らかな時間写像と139.00825秒の曲長を維持し、上声の各発音の最上音を主旋律として音高・開始時刻を保持します。低音はA2〜B3付近へ移し、伴奏の強さを抑えて最大24msの分散を付けます。自然なピアノ倍音を残し、55Hzハイパス・3.4kHzローパス、穏やかなダンパー減衰と小さな室内反射を使用します。動的コンプレッサーは使いません。

比較ページはクリック後に選択中の音源だけを取得します。Web Audioのゲインで音量を操作し、両音源を既存の-42 LUFS基準へ静的に校正します。同じ再生位置で180msのクロスフェードを行い、古い取得結果を破棄して連打・停止後の意図しない再生を防ぎます。保存先は比較ページ専用です。

検証：全長PCMデコード、96kHz補間ピーク、音割れ・非数値・音量差、汎用小型スピーカー帯域、実際のEdge音声でのA/B切替・位置保持・シーク・音量0%・停止再開・曲末・非表示時の停止。WebKitは375／390pxの表示と音声非対応時の無効状態を確認しました。このWindows用WebKitには音声APIがないため、Safari実音確認とは数えません。人による聴感評価とiPhone実機試聴は未実施です。

再生検証は `server.js` を起動して実行します。試聴用6ファイルと、既存カタログが指す5曲・出典ページをサーバーの許可リストへ登録します。音源ファイルと本編プレーヤーは変更しません。

```powershell
$env:OYASUMI_PLAYWRIGHT_PATH = '<Playwright Core のインストール先>'
node test-support/piano-prototype/verify.cjs <検証結果の出力先>
node test-roof-music-sequence.cjs
node test-music-warm-arrangement.cjs
```

出典・入力譜・サンプルごとのURLとSHA-256・加工・音響検証は `assets/piano-prototype-v1/provenance.json`、再生検証はこのフォルダーの `verification.json` に記録します。配信容量の増加は `size.json` に記載します。
