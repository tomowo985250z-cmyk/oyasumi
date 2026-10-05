# 基本猫の6表情画像

承認済みの8毛色 × 6表情、計48枚。原本は `../domestic-cats-review/approved-eight-v3/` に保存。

各原本の3列×2行を512px角で切り出し、上段は calm / sleepy / yawn、下段は restless / happy / surprised。円形バッジの外側のみ透過し、restless の青い汗マークは保持する。表情・毛柄・毛並み・色・構図は原本のまま。

sleepy は上段中央の細く重いまぶた、surprised は黒目の周囲に白目が見える仕様。黒猫は白系の目・口表現を保持。

`cat-faces.js` が画像を表示し、`prepare-release.js` が画像内容のSHA-256をURLへ反映する。画像変更後は `npm run release`、検証は `npm run check`、`node test-wild-cats.js`、`node test-domestic-faces-browser.js`、`node test-browser.js --test-domestic-faces-preview` を実行する。
