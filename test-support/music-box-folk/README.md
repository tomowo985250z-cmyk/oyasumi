# 伝統民謡4曲の独自制作（2026-11-04）

既存5曲は `df8f6b2` の録音・編曲・テンポ・プレイヤー校正値を維持。
追加順はグリーンスリーブス、ロンドンデリーの歌、スカボロー・フェア、蛍の光。
9曲の選曲データだけを拡張し、既存の順番再生・3秒クロスフェード・曲送り・停止再開・独立音量保存・自然音との併用・夜間屋根限定条件は変更しない。

## 旋律と権利の確認

| 曲 | 使用した旋律資料 | 判断・扱い |
|---|---|---|
| グリーンスリーブス | [Mutopia-109](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=109) | Traditional、Public Domainと明示。旋律声部のみ参照。原譜のG♯・F♯も維持。 |
| ロンドンデリーの歌 | [Petrie, 1855, p.57](https://archive.org/details/petriecollection01petr/page/57/mode/1up) / [譜面画像とPD表示](https://commons.wikimedia.org/wiki/File:Londonderry_Air,_first_print_1855,_sheet_music_edited_by_George_Petrie.jpg) | 1855年刊の作者不詳の伝承旋律。原譜の半音階的経過音も維持。Petrieの伴奏、Danny Boyの歌詞や現代の編曲は不使用。 |
| スカボロー・フェア | [Kidson, Traditional Tunes, 1891, p.172](https://archive.org/details/imslp-tunes-kidson-frank/page/n175/mode/1up) | A. Wardill / Goathlandからの第2伝承版。作者不詳の1891年公刊旋律。現代に有名な版とは旋律が異なることを出典画面にも明記。 |
| 蛍の光 | [Mutopia-1121](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1121), Horetzky (1796–1870), Boije #268 | Public Domainと明示された歴史的譜面の上声旋律のみ。伴奏と歌詞は不使用。音価を2倍の表記に換算してゆったりした演奏に。 |

作者不詳の古い公刊旋律については、日本の[著作権法第51・52条](https://www.cric.or.jp/db/domestic/doc/Copyright_Act_Effective_20260521.pdf)の保護期間と上記年代を照合。近現代の録音・編曲の権利と混同しない。各旋律の参照資料のSHA-256はcatalog.jsonに記録。伴奏・演奏表現・合成録音は独自制作し、追加4曲の当該成果物はCC0 1.0で提供。既存曲のライセンスは維持。

## 音づくりと再生成

`tunes.json` の旋律を2巡し、2巡目は伴奏の音順と強弱を少し変える。移調による旋律の簡略化や、不協和音の自動除去は行わない。既存の `music-box-elegant/voices.json` のAir / Clair / Träumereiの中間音質をそのまま継承し、同じ独立合成器と滑らかなフレーズ時間写像で制作。新たな録音・音色データやライブラリーをアプリに追加しない。

WAV再生成: `node test-support/music-box-folk/render.cjs <空の出力ディレクトリ>`。
配信用MP3は既存制作と同じLAMEJS、モノラル24kHz / 96kbps。デコーダー遅延1105サンプルを除く校正を行い、曲ごとの固定ゲインで既存と同じ-42 LUFS（プレイヤーの共通倍率前）に統一。圧縮で強弱をつぶさない。

検証: `node test-folk-music.cjs`、`node test-roof-music-sequence.cjs`。
全PCMの有限値・クリッピング、96kHz補間ピーク、デコード相関・曲長、全区間のネイティブOfflineAudioContext再生と接続境界を検証。既存5音源のSHA-256一致も確認。自然音＋クロスフェード中2曲の保守的ピーク上限に約19.20dBの余裕。

ブラウザーで9曲すべてを本来の長さを指定して開始・曲送りし、テスト配信時だけ区間を9秒に短縮して9→1までの自動接続を確認。元の曲長の2周は決定的AudioContextフィクスチャで検証。音量0%、37%保存、停止再開、非表示中の競合、自然音との独立設定も確認。

解析・録音ハッシュは `assets/folk-music-v1/production.json`、作業用WAV・参照譜面・詳細ブラウザーレポートは作業領域 `output/folk-music-nine-v1/` に保存。
人による聴感評価は未実施。このWindows環境には接続iPhone/iPadが検出されず、iPhone実機の確認も未実施。WebKitでのスマホ幅確認と実機確認は区別する。

スマホ幅320 / 375 / 430pxでEdgeのON/OFF・音量保存を確認。Windows用の検証WebKitはWeb Audio API自体を提供しないため、再生スイッチが既存仕様どおり無効になることと、表示・音量保存を確認する。実際のSafariでの音声再生確認としては数えない。
