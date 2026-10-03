globalThis.CatRoles = (() => {
 const options = [
  {id:null,text:'未設定',cat:''},
  {id:'steady',text:'会社員・事務',cat:'こつこつ猫'},
  {id:'guardian',text:'公務員',cat:'まもり猫'},
  {id:'caring',text:'医療・介護',cat:'よりそい猫'},
  {id:'watchful',text:'教育・保育',cat:'みまもり猫'},
  {id:'mechanic',text:'IT・技術',cat:'メカ猫'},
  {id:'maker',text:'製造・建設',cat:'ものづくり猫'},
  {id:'welcoming',text:'販売・接客',cat:'おもてなし猫'},
  {id:'foodie',text:'飲食',cat:'ごちそう猫'},
  {id:'courier',text:'運輸・物流',cat:'おとどけ猫'},
  {id:'foresight',text:'金融・保険',cat:'さきよみ猫'},
  {id:'creative',text:'クリエイティブ',cat:'ひらめき猫'},
  {id:'independent',text:'自営業・フリーランス',cat:'マイペース猫'},
  {id:'learner',text:'学生',cat:'まなび猫'},
  {id:'homely',text:'主婦・主夫',cat:'おうち猫'},
  {id:'resting',text:'無職・休職中',cat:'ひとやすみ猫'},
  {id:'carefree',text:'その他',cat:'きまま猫'},
  {id:'private',text:'答えたくない',cat:''}
 ];
 const label = id => options.find(option=>option.id===id)?.cat || '';
 return {options,label};
})();
