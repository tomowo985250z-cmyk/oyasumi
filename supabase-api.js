globalThis.createOyasumiConnection = function createOyasumiConnection(storageKey = 'oyasumi-auth') {
  const client = globalThis.supabase.createClient(OyasumiConfig.url, OyasumiConfig.publishableKey, {
    auth: { storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: {
      fetch: async (input, options = {}) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const signal = options.signal && typeof AbortSignal.any === 'function'
          ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
        try { return await fetch(input, { ...options, signal }); }
        finally { clearTimeout(timer); }
      }
    }
  });
  let initialization;
  let userId;
  let needsNickname = false;
  let reactionVersion = 2;
  let historyCache;
  let initialAppearance;
  const timings=[];
  async function timed(stage,work) {
    const start=performance.now();
    try { return await work(); }
    finally { timings.push({stage,start,ms:performance.now()-start});if(timings.length>60)timings.shift(); }
  }
  const catCacheScope=OyasumiConfig.url+'|'+storageKey;
  const allowedExpressions=['calm','sleepy','yawn','restless','happy','surprised'];
  const allowedCoats=['calico','orange','brown','silver','black','white','tuxedo','gray','manul','sand','black-footed','fishing','snow-leopard','leopard','cheetah','jaguar'];
  async function readProfiles(ids,single=false) {
    const query=fields=>{
      const q=client.from('oyasumi_profiles').select(fields);
      return single?q.eq('user_id',ids[0]).maybeSingle():q.in('user_id',ids);
    };
    let result=await query('user_id,nickname,cat_expression,cat_coat');
    const expressionSupported=!['42703','PGRST204'].includes(result.error?.code);
    if(!expressionSupported){
      result=await query('user_id,nickname,cat_expression');
      if(['42703','PGRST204'].includes(result.error?.code))result=await query('user_id,nickname');
    }
    return {profiles:checked(result),expressionSupported};
  }
  function trendHistory(clock) {
    const night = clock.nightDate, now = performance.now();
    if (!historyCache || historyCache.night !== night) historyCache = { night, rows: [], nextAt: 0, pending: false };
    const cache = historyCache;
    if (!cache.pending && now >= cache.nextAt) {
      cache.pending = true;
      // Optional background read: never delay posts/counts on a week of history.
      // Read only five small fields, at most 5,000 events plus one overflow probe.
      void (async () => {
        try {
          const since = new Date(Date.parse(night + 'T00:00:00Z') - 7 * 86400000).toISOString().slice(0,10);
          const rows = [];
          for (let offset = 0; offset <= 5000; offset += 1000) {
            const page = checked(await client.from('oyasumi_posts').select('user_id,choice,created_at,event_order,night_date')
              .gte('night_date', since).lt('night_date', night).order('event_order', {ascending:false}).range(offset, offset + (offset === 5000 ? 0 : 999)));
            rows.push(...page);
            if (rows.length > 5000) throw new Error('History budget exceeded');
            if (page.length < 1000) break;
          }
          cache.rows = rows.map(row => ({userId:row.user_id,status:row.choice,time:Date.parse(row.created_at),order:Number(row.event_order),nightDate:row.night_date}));
          cache.nextAt = performance.now() + 3600000;
        } catch {
          // Never use truncated counts as a baseline. Keep a valid same-night
          // cache after transient failures; otherwise the indicator uses two cats.
          cache.nextAt = performance.now() + 300000;
        } finally { cache.pending = false; }
      })();
    }
    return cache.rows;
  }
  function checked(result) {
    if (result.error) throw result.error;
    return result.data;
  }
  async function rpc(name, args = {}) { return timed(name,async()=>checked(await client.rpc(name,args))); }
  const normalizeCounts = values => Object.fromEntries(Object.entries({goodnight:0,dream:0,tomorrow:0,comfort:0,...values}).map(([id,count]) => [id,Number.isSafeInteger(Number(count)) && Number(count)>0 ? Number(count) : 0]));
  async function initialize() {
    if (!initialization) {
      const initializeSession = async () => {
      let session = checked(await timed('session',()=>client.auth.getSession())).session;
      if (!session) session = checked(await timed('sign-in',()=>client.auth.signInAnonymously())).session;
      if (!session?.user?.id) throw new Error('認証できませんでした。');
      userId = session.user.id;
      // Cache hints only warm images after this session's identity is known.
      globalThis.CatImages?.primeCoat?.(userId,catCacheScope);
      const appearance=await timed('initial-appearance',()=>readProfiles([userId],true)),profile=appearance.profiles;
      initialAppearance={...appearance,at:performance.now()};
      needsNickname = !profile?.nickname;
      if(profile?.user_id===userId)globalThis.CatImages?.confirmCoat?.(userId,catCacheScope,profile.cat_coat,profile.cat_expression);
      return userId;
      };
      // Serialize first-time sign-in across tabs sharing the same origin.
      initialization = (globalThis.navigator?.locks
        ? navigator.locks.request(storageKey + '-initialize', initializeSession)
        : initializeSession()).catch(error => { initialization = undefined; throw error; });
    }
    return initialization;
  }
  async function assertIdentity(expected) {
    const session=checked(await client.auth.getSession()).session;
    if(session?.user?.id!==expected){initialization=undefined;initialAppearance=undefined;userId=undefined;throw Object.assign(new Error('Authentication changed during cat read'),{code:'CAT_AUTH_CHANGED'});}
  }
  async function publish(progress,key,payload,clock,expected) {
    if(typeof progress?.[key]!=='function')return;
    try{await assertIdentity(expected);}catch(error){if(error.code==='CAT_AUTH_CHANGED')progress.onIdentityChanged?.();throw error;}
    if(clock.serverNow+performance.now()-clock.monotonicAt<clock.resetAt)progress[key](typeof payload==='function'?payload():payload);
  }
  async function readMorning(clock) {
    try {
      let rows;
      try { rows=await rpc('oyasumi_morning_reactions_v2'); }
      catch(error){if(error.code!=='PGRST202')throw error;rows=await rpc('oyasumi_morning_reactions');}
      const row=rows.find(r=>r.night_date===clock.morningNightDate);
      if(row){const counts=normalizeCounts(row.counts||{goodnight:row.goodnight_count,dream:row.dream_count,tomorrow:row.tomorrow_count,comfort:row.comfort_count});return {nightDate:row.night_date,...counts,counts};}
    } catch { /* Optional reads retain their existing failure/legacy behavior. */ }
    return null;
  }
  async function readSummary(clock) {
    try {const rows=await rpc('oyasumi_tonight_summary'),row=rows.find(r=>r.night_date===clock.nightDate);if(row)return {sleepingCount:Number(row.sleeping_count),coats:row.cat_coats,peakHours:row.peak_hours};}catch{}
    return null;
  }
  async function readTrend(clock) {
    try {const rows=await rpc('oyasumi_tonight_trend');return {trendSupported:true,trend:rows.filter(r=>r.night_date===clock.nightDate).map(r=>({time:Date.parse(r.sampled_at),awake:Number(r.awake_count),sleeping:Number(r.sleeping_count)}))};}catch{return {trendSupported:false,trend:[]};}
  }
  async function readCoatStatus() {
    try {
      const row=(await rpc('oyasumi_cat_coat_status'))[0];
      if(row&&(row.next_change_at===null||Number.isFinite(Date.parse(row.next_change_at)))){
        const status={nextChangeAt:row.next_change_at===null?null:Date.parse(row.next_change_at)};
        if(row.next_change_at===null){try{status.temporarilyUnlocked=(await rpc('oyasumi_cat_coat_cooldown_paused'))===true;}catch{}}
        return status;
      }
    }catch{}
    return null;
  }
  async function readCare() {
    try {const catCare=await rpc('oyasumi_cat_care_status');return {catCare,catStateResolved:catCare!==null};}
    catch(error){return {catCare:null,catStateResolved:error.code==='PGRST202'};}
  }
  function mapPost(row, names, expressions, coats, roles, notes) {
    return { id: row.id, userId: row.user_id, status: row.choice, intent: row.post_intent, time: Date.parse(row.created_at),
      order: row.event_order, nightDate: row.night_date, name: names.get(row.user_id) || '名無し',
      self: row.user_id === userId, color: row.user_id === userId ? 'peach' : 'slate', appearanceReady:allowedCoats.includes(coats.get(row.user_id)), expression:allowedExpressions.includes(expressions.get(row.user_id))?expressions.get(row.user_id):'calm', coat: coats.get(row.user_id) || 'calico', catRole: roles.get(row.user_id) || null, profileNote: notes.get(row.user_id) || '' };
  }
  async function snapshot(attempt=0,progress) { return timed('snapshot',()=>snapshotData(attempt,progress)); }
  async function snapshotData(attempt = 0,progress) {
    await initialize();
    const snapshotUser=userId,initial=initialAppearance;initialAppearance=undefined;
    const ownRead=initial&&performance.now()-initial.at<1000?Promise.resolve(initial):timed('own-appearance',()=>readProfiles([snapshotUser],true));
    void ownRead.catch(()=>{}); // Attach a handler while the clock read is pending.
    // Sleep is read afresh even when the coat hint and images are cached.
    const careRead=readCare();
    const contextStart=performance.now();
    const context=(await rpc('oyasumi_night_context'))[0];
    if(!context)throw new Error('夜の区切りを取得できませんでした。');
    const clock={serverNow:Date.parse(context.server_now),monotonicAt:(contextStart+performance.now())/2,
      resetAt:Date.parse(context.next_reset_at),nightDate:context.night_date,morningNightDate:context.morning_night_date};
    // This early path contains only authenticated, current cat/time/sleep data.
    // It never releases a cached coat, cached expression or cached sleep state.
    const ownProgress=Promise.all([ownRead,careRead]).then(async([appearance,care])=>{
      const p=appearance.profiles;
      if(p?.user_id===snapshotUser&&care.catStateResolved&&care.catCare?.sleepStateVersion===1){
        globalThis.CatImages?.confirmCoat?.(snapshotUser,catCacheScope,p.cat_coat,p.cat_expression,clock.serverNow);
        await publish(progress,'onOwnCat',{userId:snapshotUser,coat:p.cat_coat,expression:p.cat_expression,name:p.nickname,clock,...care},clock,snapshotUser);
      }
    }).catch(()=>{}); // The full snapshot still validates identity/errors below.
    // Independent read-only features run together instead of delaying the cat
    // by one network round trip each. Each keeps its own legacy/error handling.
    const optional=Promise.all([readMorning(clock),readSummary(clock),readTrend(clock),readCoatStatus()]);
    const [countsRows, ownRows, sleepCountResult] = await Promise.all([
      rpc('oyasumi_tonight_counts'),
      client.from('oyasumi_posts').select('*').eq('user_id', userId).order('event_order', { ascending: false }).limit(100).then(checked),
      client.from('oyasumi_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('choice', ['sleep', 'try-sleep', 'early-sleep'])
    ]);
    checked(sleepCountResult);
    const counts = countsRows[0];
    if (!counts) throw new Error('人数を取得できませんでした。');
    if(counts.night_date!==clock.nightDate){if(attempt<2)return snapshot(attempt+1,progress);throw new Error('夜が切り替わりました。もう一度取得してください。');}
    // 履歴は削除せず、最新順に読み、一人につき先頭の一件だけ公開フィードへ。
    // 投稿100件で先に切ると、連投の多い人によって他の人が欠落するためページを進める。
    const feedRows = [], seenAuthors = new Set();
    for (let offset = 0; feedRows.length < 100; offset += 100) {
      const rows = checked(await client.from('oyasumi_posts').select('*').eq('night_date', counts.night_date)
        .order('event_order', { ascending: false }).range(offset, offset + 99));
      for (const row of rows) {
        if (!seenAuthors.has(row.user_id)) { seenAuthors.add(row.user_id); feedRows.push(row); }
        if (feedRows.length === 100) break;
      }
      if (rows.length < 100) break;
    }
    const postIds = [...new Set([...feedRows, ...ownRows].map(post => post.id))];
    // Count latest awake reports across all authors, independently of the feed cap.
    const activeAwakePosts = [], activeAuthors = new Set();
    const activeSince = new Date(clock.serverNow - 3 * 3600000).toISOString();
    for (let offset = 0; ; offset += 100) {
      const rows = checked(await client.from('oyasumi_posts').select('user_id,choice,created_at,event_order')
        .eq('night_date', counts.night_date).gt('created_at', activeSince)
        .order('event_order', { ascending: false }).range(offset, offset + 99));
      for (const row of rows) {
        if(activeAuthors.has(row.user_id))continue;
        activeAuthors.add(row.user_id);
        if(row.choice === 'awake')activeAwakePosts.push({userId:row.user_id,time:Date.parse(row.created_at)});
      }
      if(rows.length < 100)break;
    }
    const authorIds = [...new Set([userId, ...feedRows.map(post => post.user_id)])];
    const readAuthors=async()=>{
      const ownAppearance=await ownRead,profiles=ownAppearance.profiles?.user_id===snapshotUser?[ownAppearance.profiles]:[];
      let expressionSupported=ownAppearance.expressionSupported;
      const payload=()=>{
        const names=new Map(profiles.map(p=>[p.user_id,p.nickname])),expressions=new Map(profiles.map(p=>[p.user_id,p.cat_expression])),coats=new Map(profiles.map(p=>[p.user_id,p.cat_coat]));
        return {userId:snapshotUser,clock,feed:feedRows.map(p=>mapPost(p,names,expressions,coats,new Map(),new Map()))};
      };
      const others=authorIds.filter(id=>id!==snapshotUser),batches=[];
      for(let i=0;i<others.length;i+=20)batches.push(timed('author-appearance',async()=>{
        const batch=await readProfiles(others.slice(i,i+20));profiles.push(...batch.profiles);expressionSupported&&=batch.expressionSupported;
        await publish(progress,'onTimeline',payload,clock,snapshotUser);
      }));
      await Promise.all([publish(progress,'onTimeline',payload,clock,snapshotUser),...batches]);return {profiles,expressionSupported};
    };
    const [{profiles,expressionSupported},roleResult,noteResult,support,{catCare,catStateResolved}]=await Promise.all([
      timed('current-appearance',readAuthors),
      client.from('oyasumi_profiles').select('user_id,cat_role').in('user_id',authorIds),
      client.from('oyasumi_profiles').select('user_id,profile_note').in('user_id',authorIds),
      timed('reaction-support',()=>client.rpc('oyasumi_reaction_counts_v3',{p_post_ids:[]})),
      careRead
    ]);
    const roleSupported = !roleResult.error;
    const roles = new Map((roleResult.data || []).map(profile => [profile.user_id, profile.cat_role]));
    const notes = new Map((noteResult.data || []).map(profile => [profile.user_id, profile.profile_note]));
    const names = new Map(profiles.map(profile => [profile.user_id, profile.nickname]));
    const expressions = new Map(profiles.map(profile => [profile.user_id, allowedExpressions.includes(profile.cat_expression) ? profile.cat_expression : 'calm']));
    const coats = new Map(profiles.filter(profile=>allowedCoats.includes(profile.cat_coat)).map(profile=>[profile.user_id,profile.cat_coat]));
    const reactions = {}, reactionCounts = {};
    // Probe even an empty timeline so the four home choices can save their intent.
    if (support.error && support.error.code !== 'PGRST202') throw support.error;
    reactionVersion = support.error ? 2 : 3;
    for (let start = 0; start < postIds.length; start += 100) {
      const args = { p_post_ids: postIds.slice(start, start + 100) };
      let rows;
      try { rows = await rpc(reactionVersion === 3 ? 'oyasumi_reaction_counts_v3' : 'oyasumi_reaction_counts_v2', args); }
      catch (error) {
        if (error.code !== 'PGRST202' || reactionVersion === 3) throw error;
        rows = await rpc('oyasumi_reaction_counts', args);
      }
      for (const row of rows) {
        if (row.my_choice) reactions[row.post_id] = row.my_choice;
        reactionCounts[row.post_id] = normalizeCounts(row.counts || {goodnight:row.goodnight_count,dream:row.dream_count,tomorrow:row.tomorrow_count,comfort:row.comfort_count});
      }
    }
    needsNickname = !names.get(userId);
    const needsCat = !profiles.some(p=>p.user_id===userId && allowedCoats.includes(p.cat_coat));
    const [morningReactions,tonightSummary,{trend,trendSupported},catCoatStatus]=await optional;
    // Never publish a read that straddled an auth identity replacement.
    await ownProgress;await assertIdentity(snapshotUser);
    const ownProfile=profiles.find(p=>p.user_id===userId);
    if(ownProfile)globalThis.CatImages?.confirmCoat?.(userId,catCacheScope,ownProfile.cat_coat,ownProfile.cat_expression,clock.serverNow+performance.now()-clock.monotonicAt);
    if(clock.serverNow+performance.now()-clock.monotonicAt>=clock.resetAt){if(attempt<2)return snapshot(attempt+1,progress);throw new Error('夜が切り替わりました。もう一度取得してください。');}
    return { userId, profileComplete: !needsNickname && !needsCat, needsNickname, needsCat, name: names.get(userId) || '', expression: expressions.get(userId) || 'calm', expressionSupported, coat: coats.get(userId) || 'calico', nightDate: counts.night_date,
      awakeCount: Number(counts.awake_count), activeAwakePosts, sleepingCount: Number(counts.sleeping_count), myState: counts.my_state, trend, trendSupported, tonightSummary, morningReactions, catRole: roles.get(userId) || null, roleSupported,
      profileNote: notes.get(userId) || '', clock, catCoatStatus, catCare, catStateResolved,
      trendHistory: trendSupported ? trendHistory(clock) : [],
      feed: feedRows.map(row => mapPost(row, names, expressions, coats, roles, notes)), ownPosts: ownRows.map(row => mapPost(row, names, expressions, coats, roles, notes)),
      reactions, reactionCounts, reactionVersion, ownSleepCount: Number(sleepCountResult.count) };
  }
  return { client, initialize, snapshot, get timings(){return timings.map(t=>({...t}));}, get userId() { return userId; }, get needsNickname() { return needsNickname; },
    getSentReactionPeople: async () => {
      const row = (await rpc('oyasumi_sent_reaction_people'))[0];
      const count = Number(row?.people_count);
      if (!row || !/^\d{4}-\d{2}-\d{2}$/.test(row.night_date) || !Number.isSafeInteger(count) || count < 0) throw new Error('Invalid sent reaction count');
      return {nightDate:row.night_date,count};
    },
    getCatCareStatus: () => rpc('oyasumi_cat_care_status'),
    giveCatMeal: () => rpc('oyasumi_give_cat_meal'),
    giveCatTreat: recipient => rpc('oyasumi_give_cat_treat', {p_recipient:recipient}),
    submitPost: (choice, intent) => reactionVersion === 3
      ? rpc('oyasumi_submit_post_v2', { p_choice: choice, p_intent: intent || (choice === 'awake' ? 'relax' : choice === 'early-sleep' ? 'sleep' : choice) })
      : rpc('oyasumi_submit_post', { p_choice: choice }),
    deletePost: id => rpc('oyasumi_delete_post', { p_post_id: id }),
    setReaction: async (id, choice) => {
      const args = { p_post_id: id, p_choice: choice };
      if (reactionVersion === 3) return rpc('oyasumi_set_reaction_v3', args);
      try { return await rpc('oyasumi_set_reaction_v2', args); }
      catch (error) {
        if (error.code !== 'PGRST202' || choice === 'comfort') throw error;
        return rpc('oyasumi_set_reaction', args);
      }
    },
    setNickname: async name => { const result = await rpc('oyasumi_set_nickname', { p_nickname: name }); needsNickname = false; try { globalThis.localStorage?.removeItem('oyasumi-name-pending-' + userId); } catch { /* The saved name remains authoritative. */ } return result; },
    setProfileNote: note => rpc('oyasumi_set_profile_note', { p_note: note }),
    setCatRole: role => rpc('oyasumi_set_cat_role', { p_role: role }),
    setCatCoat: coat => rpc('oyasumi_set_cat_coat', { p_coat: coat }),
    setCatExpression: expression => rpc('oyasumi_set_cat_expression', { p_expression: expression }) };
};
globalThis.OyasumiAPI = createOyasumiConnection();
