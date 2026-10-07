globalThis.TimelineVisibility = (() => {
 const duration = 3 * 3600000;
 const visible = (posts, now) => posts.filter(post => Number.isFinite(post.time) && now < post.time + duration);
 const nextExpiry = (posts, now) => {
  const deadlines = visible(posts, now).map(post => post.time + duration);
  return deadlines.length ? Math.min(...deadlines) : null;
 };
 return Object.freeze({visible,nextExpiry});
})();
