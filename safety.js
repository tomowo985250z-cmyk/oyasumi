// Public explanations match the current anonymous-auth app, not planned features.
globalThis.OyasumiSafety = Object.freeze({
 privacy: { title: 'プライバシーポリシー', html: `
 <p>名前やひとことは、ほかの利用者にも表示されます。本名・学校名・勤務先・連絡先など、個人を特定できる情報は入力しないでください。「そっとひとこと」と「〇〇猫」の設定は任意です。</p>
 <p>ここでは、このサービスで保存する情報と、ほかの利用者に表示される情報について説明します。</p>
 <h3>保存するもの</h3><p>Supabaseに、匿名アカウントのID、ニックネーム、猫の種類と表情、任意の「〇〇猫」と「そっとひとこと」、選択式の投稿・リアクション、その日時を保存します。職業の元の名前は保存せず、対応する猫ラベルの値を保存します。</p>
 <p>端末には、ログインを保つ情報、ニックネームの控え、朝の記録、就寝終了の情報、表示設定、案内の表示済み情報や更新確認の情報を保存します。以前の版の保存情報が残っている場合もあります。</p>
 <h3>みんなに見えるもの</h3><p>ニックネーム、猫、公開する〇〇猫、ひとこと、投稿内容と時刻、リアクションの種類別の数が見えます。「答えたくない」の〇〇猫は表示しません。人数・毛色別人数・時間帯・推移も集計して表示します。リアクションした人の名前は画面に表示しません。</p>
 <p>匿名IDはデータを結び付けるために使われ、投稿データにも含まれます。「答えたくない」の選択値もプロフィールの取得データには含まれます。匿名認証は「誰にも特定されない」という保証ではありません。〇〇猫から職業カテゴリが推測されることもあるので、答えなくても大丈夫です。</p>
 <h3>使い道と保存期間</h3><p>投稿やプロフィールの共有、本人の操作の確認、人数・推移・朝に届いたリアクションの集計に使います。日本時間06:00に前夜の投稿をタイムラインから外しますが、データベースの履歴は自動削除しません。保存期間の自動制限は現在ありません。</p>
 <h3>外部サービス</h3><p>サイトの配信にGitHub Pages、認証とデータ保存にSupabaseを使います。通信時にはIPアドレスなどがサービス側へ送られます。GitHub Pagesは安全対策のためIPアドレスを記録し、Supabaseも認証・通信のログを扱います。</p>
 <p><a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHubのプライバシー説明</a> ／ <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabaseのプライバシー説明</a></p>
 <h3>入力しない情報</h3><p>年齢・生年月日、本名、学校名、住所、電話番号、メールの入力は求めません。位置情報・写真・連絡帳を取得する処理や、広告・アクセス解析ツールはアプリに追加していません。ひとことにも個人情報を書かないでください。</p>
 <h3>変更・削除について</h3><p>プロフィールは設定から変更でき、ひとことは空欄に戻せます。自分の今夜の投稿はタイムラインの「削除」で削除できます。アカウントや全履歴を一括削除する画面は現在ありません。端末の保存情報を消してもSupabaseのデータは消えず、同じ匿名アカウントに戻れなくなる場合があります。</p>
 <p class="quiet-note">更新：2026年10月5日</p>` },
 rules: { title: '利用規約・安全ルール', html: `
 <p>ここは、眠る前に気持ちをそっと伝える場所です。利用するときは、次の約束を守ってください。</p>
 <h3>自分と仲間を守ろう</h3><p>本名・学校名・住所・電話番号・メール・SNS IDなど、誰かがわかる情報は書かないでね。友だちの情報も同じです。ニックネームは、本名と違う呼び名がおすすめです。</p>
 <p>人を傷つける言葉、差別的・性的な表現、連絡先への誘導は使わないでください。入力チェックはすべてを見つけられるわけではありません。迷ったら書かなくても大丈夫です。</p>
 <h3>無理せず使おう</h3><p>投稿やリアクションは、用意された選択肢から選びます。プロフィールは他の利用者にも見えるので、書く前に確認してね。職業とひとことは任意です。</p>
 <p>子どもの方は、使い方や公開する内容を保護者など信頼できる大人と相談してください。こわい内容を見たときや困ったときは、画面を閉じて、信頼できる大人に相談しよう。</p>
 <h3>眠る時間を大切に</h3><p>返事やリアクションを待ち続けなくても大丈夫。スマホを置いて、ゆっくり休もう。ここは医療や緊急の相談窓口ではありません。つらさが続くときは、身近な大人や専門の相談先を頼ってください。</p>
 <h3>サービスについて</h3><p>通信や外部サービスの状況により、表示・保存ができないことがあります。機能やこの説明は、必要に応じて見直します。変更後の内容はこの画面で確認できます。</p>
 <p class="quiet-note">更新：2026年10月5日</p>` }
});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-safety]');
 if(button){const content=OyasumiSafety[button.dataset.safety];if(!content)return;
  document.querySelector('#safety-title').textContent=content.title;
  document.querySelector('#safety-content').innerHTML=content.html;
  const dialog=document.querySelector('#safety-dialog');dialog.showModal();
  const title=document.querySelector('#safety-title');title.tabIndex=-1;title.focus({preventScroll:true});dialog.scrollTop=0;
 }
 if(event.target.closest('[data-close-safety]'))document.querySelector('#safety-dialog').close();
});
