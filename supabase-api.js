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
  function checked(result) {
    if (result.error) throw result.error;
    return result.data;
  }
  async function rpc(name, args = {}) { return checked(await client.rpc(name, args)); }
  async function initialize() {
    if (!initialization) {
      const initializeSession = async () => {
      let session = checked(await client.auth.getSession()).session;
      if (!session) session = checked(await client.auth.signInAnonymously()).session;
      if (!session?.user?.id) throw new Error('認証できませんでした。');
      userId = session.user.id;
      const profile = checked(await client.from('oyasumi_profiles').select('nickname').eq('user_id', userId).maybeSingle());
      needsNickname = !profile?.nickname;
      return userId;
      };
      // Serialize first-time sign-in across tabs sharing the same origin.
      initialization = (globalThis.navigator?.locks
        ? navigator.locks.request(storageKey + '-initialize', initializeSession)
        : initializeSession()).catch(error => { initialization = undefined; throw error; });
    }
    return initialization;
  }
  function mapPost(row, names, expressions, coats, roles, notes) {
    return { id: row.id, userId: row.user_id, status: row.choice, time: Date.parse(row.created_at),
      order: row.event_order, nightDate: row.night_date, name: names.get(row.user_id) || '名無し',
      self: row.user_id === userId, color: row.user_id === userId ? 'peach' : 'slate', expression: expressions.get(row.user_id) || 'calm', coat: coats.get(row.user_id) || 'calico', catRole: roles.get(row.user_id) || null, profileNote: notes.get(row.user_id) || '' };
  }
  async function snapshot() {
    await initialize();
    const [countsRows, ownRows, sleepCountResult] = await Promise.all([
      rpc('oyasumi_tonight_counts'),
      client.from('oyasumi_posts').select('*').eq('user_id', userId).order('event_order', { ascending: false }).limit(100).then(checked),
      client.from('oyasumi_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('choice', ['sleep', 'try-sleep', 'early-sleep'])
    ]);
    checked(sleepCountResult);
    const counts = countsRows[0];
    if (!counts) throw new Error('人数を取得できませんでした。');
    let morningReactions = null;
    try {
      const rows = await rpc('oyasumi_morning_reactions');
      const row = rows.find(row => row.night_date === counts.night_date);
      if (row) morningReactions = { nightDate: row.night_date, goodnight: Number(row.goodnight_count), dream: Number(row.dream_count), tomorrow: Number(row.tomorrow_count), comfort: Number(row.comfort_count) };
    } catch { /* A failed receipt fetch must not become a false zero or block existing features. */ }
    let tonightSummary = null;
    try {
      const rows = await rpc('oyasumi_tonight_summary');
      const row = rows.find(row => row.night_date === counts.night_date);
      if (row) tonightSummary = { sleepingCount: Number(row.sleeping_count), coats: row.cat_coats, peakHours: row.peak_hours };
    } catch { /* 集計の失敗で投稿や既存の共有機能を止めない。 */ }
    let trend = [], trendSupported = false;
    try {
      const rows = await rpc('oyasumi_tonight_trend');
      trendSupported = true;
      trend = rows.filter(row => row.night_date === counts.night_date).map(row => ({
        time: Date.parse(row.sampled_at), awake: Number(row.awake_count), sleeping: Number(row.sleeping_count)
      }));
    } catch { /* Trend failure must not block posts, cats or existing counts. */ }
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
    const authorIds = [...new Set([userId, ...feedRows.map(post => post.user_id)])];
    let profileResult = await client.from('oyasumi_profiles').select('user_id,nickname,cat_expression,cat_coat').in('user_id', authorIds);
    const expressionSupported = !['42703', 'PGRST204'].includes(profileResult.error?.code);
    if (!expressionSupported) {
      profileResult = await client.from('oyasumi_profiles').select('user_id,nickname,cat_expression').in('user_id', authorIds);
      if (['42703', 'PGRST204'].includes(profileResult.error?.code))
        profileResult = await client.from('oyasumi_profiles').select('user_id,nickname').in('user_id', authorIds);
    }
    const profiles = checked(profileResult);
    const roleResult = await client.from('oyasumi_profiles').select('user_id,cat_role').in('user_id', authorIds);
    const roleSupported = !roleResult.error;
    const roles = new Map((roleResult.data || []).map(profile => [profile.user_id, profile.cat_role]));
    const noteResult = await client.from('oyasumi_profiles').select('user_id,profile_note').in('user_id', authorIds);
    const notes = new Map((noteResult.data || []).map(profile => [profile.user_id, profile.profile_note]));
    const names = new Map(profiles.map(profile => [profile.user_id, profile.nickname]));
    const allowedExpressions = ['calm', 'sleepy', 'yawn', 'restless', 'happy', 'surprised'];
    const expressions = new Map(profiles.map(profile => [profile.user_id, allowedExpressions.includes(profile.cat_expression) ? profile.cat_expression : 'calm']));
    const allowedCoats = ['calico','orange','brown','silver','black','white','tuxedo','gray'];
    const coats = new Map(profiles.map(profile => [profile.user_id, allowedCoats.includes(profile.cat_coat) ? profile.cat_coat : 'calico']));
    const reactions = {}, reactionCounts = {};
    for (let start = 0; start < postIds.length; start += 100) {
      const args = { p_post_ids: postIds.slice(start, start + 100) };
      let rows;
      try { rows = await rpc('oyasumi_reaction_counts_v2', args); }
      catch (error) {
        if (error.code !== 'PGRST202') throw error;
        rows = await rpc('oyasumi_reaction_counts', args);
      }
      for (const row of rows) {
        if (row.my_choice) reactions[row.post_id] = row.my_choice;
        reactionCounts[row.post_id] = { goodnight: Number(row.goodnight_count), dream: Number(row.dream_count), tomorrow: Number(row.tomorrow_count), comfort: Number(row.comfort_count ?? 0) };
      }
    }
    needsNickname = !names.get(userId);
    const needsCat = !profiles.some(p=>p.user_id===userId && allowedCoats.includes(p.cat_coat));
    return { userId, profileComplete: !needsNickname && !needsCat, needsNickname, needsCat, name: names.get(userId) || '', expression: expressions.get(userId) || 'calm', expressionSupported, coat: coats.get(userId) || 'calico', nightDate: counts.night_date,
      awakeCount: Number(counts.awake_count), sleepingCount: Number(counts.sleeping_count), myState: counts.my_state, trend, trendSupported, tonightSummary, morningReactions, catRole: roles.get(userId) || null, roleSupported,
      profileNote: notes.get(userId) || '',
      feed: feedRows.map(row => mapPost(row, names, expressions, coats, roles, notes)), ownPosts: ownRows.map(row => mapPost(row, names, expressions, coats, roles, notes)),
      reactions, reactionCounts, ownSleepCount: Number(sleepCountResult.count) };
  }
  return { client, initialize, snapshot, get userId() { return userId; }, get needsNickname() { return needsNickname; },
    submitPost: choice => rpc('oyasumi_submit_post', { p_choice: choice }),
    deletePost: id => rpc('oyasumi_delete_post', { p_post_id: id }),
    setReaction: async (id, choice) => {
      const args = { p_post_id: id, p_choice: choice };
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
