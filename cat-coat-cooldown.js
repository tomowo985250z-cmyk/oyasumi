globalThis.CatCoatCooldown = (() => {
 const available = (status, now) => Boolean(status && (status.nextChangeAt === null || Number.isFinite(status.nextChangeAt) && now >= status.nextChangeAt));
 const message = (status, now) => !status ? '変更可能日を確認できません。再読み込みしてください。' : status.nextChangeAt === null ? '初回選択はすぐに保存できます。保存後7日間は変更できません。' : `${available(status,now)?'変更可能です。':'7日間は変更できません。'} 次回変更可能：${new Date(status.nextChangeAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}（日本時間）`;
 return Object.freeze({available,message});
})();
