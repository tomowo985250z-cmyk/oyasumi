# 夜猫の仕草・全16猫種

三毛猫で採用された「丸くなる」「伸び」「窓辺で寝そべる」を全16猫種へ展開。起きている自分の猫がJST18:00〜翌6:00に既存の猫部屋で仕草を変える。座り40％・他の3仕草は各20％。昼・就寝・プロフィールの既存表示と給餌・月の処理を維持する。DB変更なし。

`night-cats.js` は猫のIDと夜の日付から15分枠を選ぶ。5枠で座り2回、各追加姿勢1回。午前0時は基準を変えず、同じ枠で再読み込みしても同じ仕草になる。追加PNG48枚のアルファ輪郭を測定し、クッション・ラグ・窓台に足元が接するよう猫種別に位置・サイズを調整した。三毛猫の採用画像は同一ファイルの画素を使用。画像の来歴とハッシュは `assets/night-gestures-v1/` に保存。

確認用の一覧は [全16猫種・4姿勢](../output/night-cats-v1/index.html)。比較画像は同フォルダーの `comparison-1.png`〜`comparison-4.png`。

検証コマンド：

```powershell
& ./output/node-tools/node.exe test-night-cats.cjs
& ./output/node-tools/node.exe test-night-cats-browser.cjs
& ./output/node-tools/node.exe test-night-cats-browser.cjs --edge
& ./output/node-tools/node.exe test-support/verify-night-cats-regressions.cjs
& ./output/node-tools/node.exe prepare-release.js --check
```

WebKit・Edgeそれぞれ320/360/375/390/402/414/430px ×16猫種×4姿勢の448表示。APIはローカルのfixtureで置換し、本番DBへ通信・保存しない。再読み込み、午前0時、6時/18時、昼と就寝への復帰、4姿勢からの給餌と6秒後の復帰、非表示からの復帰、実タイマーによる15分切替を検証する。別の回帰テストで月の1秒更新・月齢・非表示復帰と、給餌中の頭の実描画を確認する。

実機iPhoneは未検証。PWAはブラウザー内のstandalone相当として確認する。

お庭・縁側の試作は `output/cat-places-prototype-v1/` 内のみで、この夜猫リリースには含めない。作業中のSQLも含めない。
