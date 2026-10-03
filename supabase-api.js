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
  function checked(result) {
    if (result.error) throw result.error;
    return result.data;
  }
  async function rpc(name, args = {}) { return checked(await client.rpc(name, args)); }
  async function initialize(initialName = 'ともを') {
    if (!initialization) {
      const initializeSession = async () => {
      let session = checked(await client.auth.getSession()).session;
      if (!session) session = checked(await client.auth.signInAnonymously()).session;
      if (!session?.user?.id) throw new Error('認証できませんでした。');
      userId = session.user.id;
      const profile = checked(await client.from('oyasumi_profiles').select('nickname').eq('user_id', userId).maybeSingle());
      if (!profile) {
        try { await rpc('oyasumi_set_nickname', { p_nickname: initialName }); }
        catch (error) {
          // SQL counts code points; the UI counts graphemes. Retain the local
          // draft and use the default profile only for a validation rejection.
          if (error.code !== '22023' && error.code !== '23514') throw error;
          await rpc('oyasumi_set_nickname', { p_nickname: 'ともを' });
        }
      }
      return userId;
      };
      // Serialize first-time sign-in across tabs sharing the same origin.
      initialization = (globalThis.navigator?.locks
        ? navigator.locks.request(storageKey + '-initialize', initializeSession)
        : initializeSession()).catch(error => { initialization = undefined; throw error; });
    }
    return initialization;
  }
  function mapPost(row, names) {
    return { id: row.id, userId: row.user_id, status: row.choice, time: Date.parse(row.created_at),
      order: row.event_order, nightDate: row.night_date, name: names.get(row.user_id) || 'ともを',
      self: row.user_id === userId, color: row.user_id === userId ? 'peach' : 'slate' };
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
    const feedRows = checked(await client.from('oyasumi_posts').select('*').eq('night_date', counts.night_date).order('event_order', { ascending: false }).limit(100));
    const postIds = [...new Set([...feedRows, ...ownRows].map(post => post.id))];
    const authorIds = [...new Set([userId, ...feedRows.map(post => post.user_id)])];
    const profiles = checked(await client.from('oyasumi_profiles').select('user_id,nickname').in('user_id', authorIds));
    const names = new Map(profiles.map(profile => [profile.user_id, profile.nickname]));
    const reactions = {}, reactionCounts = {};
    for (let start = 0; start < postIds.length; start += 100) {
      const rows = await rpc('oyasumi_reaction_counts', { p_post_ids: postIds.slice(start, start + 100) });
      for (const row of rows) {
        if (row.my_choice) reactions[row.post_id] = row.my_choice;
        reactionCounts[row.post_id] = { goodnight: Number(row.goodnight_count), dream: Number(row.dream_count), tomorrow: Number(row.tomorrow_count) };
      }
    }
    return { userId, name: names.get(userId) || 'ともを', nightDate: counts.night_date,
      awakeCount: Number(counts.awake_count), sleepingCount: Number(counts.sleeping_count), myState: counts.my_state,
      feed: feedRows.map(row => mapPost(row, names)), ownPosts: ownRows.map(row => mapPost(row, names)),
      reactions, reactionCounts, ownSleepCount: Number(sleepCountResult.count) };
  }
  return { client, initialize, snapshot, get userId() { return userId; },
    submitPost: choice => rpc('oyasumi_submit_post', { p_choice: choice }),
    deletePost: id => rpc('oyasumi_delete_post', { p_post_id: id }),
    setReaction: (id, choice) => rpc('oyasumi_set_reaction', { p_post_id: id, p_choice: choice }),
    setNickname: name => rpc('oyasumi_set_nickname', { p_nickname: name }) };
};
globalThis.OyasumiAPI = createOyasumiConnection();
