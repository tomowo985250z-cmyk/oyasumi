# オルゴール・自然音の出典確認

確認日：2026-11-05。日本での現行5曲と、実行時に使う自然音3種類を対象とする。取得ファイルのSHA-256、入力イベントの系譜、現行音源・再生コードの保全記録は [照合記録](audio-rights-provenance.json) に保存した。

## 原曲と制作経路

バッハ1750年、ショパン1849年、シューマン1856年、ドビュッシー1918年、サティ1925年没。原曲自体は日本で保護期間を経過している。死後70年・戦時加算を考慮しても今回の原曲は2026年時点で期間内に残らず、2018年改正による消滅済み権利の復活もない。根拠は [文化庁の保護期間Q&A（問2・4・7〜10）](https://www.bunka.go.jp/seisaku/chosakuken/hokaisei/kantaiheiyo_chosakuken/1411890.html)。原曲の期間満了と、現代の譜面・編曲・演奏録音の条件は区別した。

全5曲とも第三者の楽譜・機械生成MIDIを入力にしているため、「第三者の著作物を一切使用していない」とは扱わない。現在の `scores.json` の sourceEventHash を取得時の編曲イベントへ照合し、取得譜面・MIDIのハッシュが保存済みカタログと一致することを確認。オルゴールの音は独自の正弦波・減衰・木箱共鳴による合成で、第三者の演奏録音、楽器サンプル、SoundFontや参考作品の録音データは入力していない。オフラインMP3符号化器を音色素材とは扱わず、既存のソフトウェア権利表示も維持する。

| 曲 | 実際の入力 | 条件と表示判断 |
| --- | --- | --- |
| 月の光／ドビュッシー | [Mutopia-1778](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1778)、Keith OHara、Fromont 1905、original.mid | 公開ページと保存.lyの双方でPublic Domain。独自の26小節抜粋・終止。任意の出典・浄書者リンクだけ削除し、曲名・作曲者は維持。 |
| G線上のアリア／バッハ | [Mutopia-242](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=242)、Jeff Covey、bach-air-score.mid | CC BY-SA 3.0。クレジット・ライセンス・変更表示と派生音源の同条件提供を維持。ページに掲載されたHans Hokkeの別MIDIは取得記録にはあるが現行入力ではない。 |
| ノクターン第2番／ショパン | [Mutopia-1590](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1590)、Renato Biolcati Rinaldi、1881 Schirmer版 | CC BY-SA 3.0。クレジット・ライセンス・変更表示と派生音源の同条件提供を維持。入力.lyの©2014表示も現行クレジットへ反映。 |
| トロイメライ／シューマン | [Mutopia-504](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=504)、Ying-Chun Liu、Leichte Stucke 1900 | 公開ページと保存.lyの双方でPublic Domain。任意の出典・浄書者リンクだけ削除し、曲名・作曲者は維持。 |
| ジムノペディ第1番／サティ | [Mutopia-37](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=37)、Evin Robertson | 公開ページと保存.lyの双方でPublic Domain。保存.lyはDover版の新しい翻訳部分を含めないと明記。任意の出典・浄書者リンクだけ削除し、曲名・作曲者は維持。 |

[Mutopiaのライセンス説明](https://www.mutopiaproject.org/legal.html) は、Public Domain提供物の改変・販売・配布・録音・演奏を認め、BY-SA提供物には著作者表示と継承条件を指定する。[CC BY-SA 3.0本文](https://creativecommons.org/licenses/by-sa/3.0/legalcode.en) の3・4節を確認し、商用利用・改変・再配布が可能でも著作者名・作品名・URI・ライセンス・変更表示等を外せないものは残した。BY-SA条件をアプリ全体へ拡張するものではない。

### 月の光のメタデータ不整合

`786dd7e` で「月光ソナタ／Stewart Holmes／Mutopia-276」の録音ライセンス文字列が「月の光」にも誤って付いた。取得済みMutopia-1778の.ly/.midハッシュ、`roof-moonlight-music-v1/render.cjs` のoriginal.mid読込、独自終止の生成、各世代のイベント照合では一貫してドビュッシーの入力を使用している。現行catalogの誤った録音ライセンス記述だけを修正した。旧版の音源・ライセンス記録は削除せず、既に提供した旧版の許諾を取り消すものではない。

## 自然音

| 使用音 | 入手元・作者 | 条件と判断 |
| --- | --- | --- |
| 鳥／birds.wav | [song_thrush_2007_05_17.wav](https://freesound.org/people/reinsamba/sounds/35054/)、reinsamba、Freesound公式HQプレビュー | 保存記録はCC BY 4.0。商用利用・再配布・改変可、要クレジット・ライセンスリンク・変更表示。取得記録と現行ファイルのハッシュは確認。今回公開元ページを再取得できず、最新表示の独立再確認は未完了のため削除しない。 |
| 虫／crickets.wav | [Night time crickets call](https://freesound.org/people/Clearwavsound/sounds/523439/)、Clearwavsound、Freesound公式HQプレビュー | 公開元と保存記録はCC BY 3.0。商用利用・再配布・改変可、要クレジット・ライセンスリンク・変更表示。維持。 |
| セミ／cicadas.wav | [Tokyo-cicadas.wav](https://freesound.org/people/xserra/sounds/320519/)、xserra、Freesound公式HQプレビュー | 公開元と保存記録はCC BY 4.0。商用利用・再配布・改変可、要クレジット・ライセンスリンク・変更表示。維持。 |

[Freesound利用規約](https://freesound.org/help/tos_web/) と [FAQの利用・クレジット条件](https://freesound.org/help/faq/#licenses)、[CC BY 4.0本文](https://creativecommons.org/licenses/by/4.0/legalcode.en)、[CC BY 3.0本文](https://creativecommons.org/licenses/by/3.0/legalcode.en) を確認。無料・公式プレビューであることを表記不要の根拠にはしない。使用ファイルは収録全体の変換・定量減音・端の接続処理を行っており、現在の出典ページに作者・原題・元ページ・ライセンス・加工内容があるため維持する。BYはBY-SAと異なり同一ライセンス継承を要求しないが、元素材のクレジットは必要。

## 今回の変更・確認範囲

音質・再生開始の先行作業 `c4b6463` と0%時の選曲を維持する `6f58751` を保持した上で、権利確認では出典HTML・現行ライセンスメタデータ・調査記録だけを変更する。音源8ファイル、オルゴール／自然音の再生コード、生成器・音色設定のSHA-256が権利整理の前後で一致することを確認する。設定内の両出典リンク、必要なCC表示・ライセンス全文、既存の履歴・取得記録は維持。未使用の参考録音ページへの任意リンクは現行出典ページから外すが、従来のreferences.json記録は残す。
