# Temporary Cat Species Unlock

Apply `cat-coat-cooldown-temporary-unlock.sql` in Supabase SQL Editor after
`cat-coat-cooldown.sql`. This pauses only the seven-day species-change check.
Existing ownership checks, profile RLS, validation and private change records
remain active. Users cannot read or modify the private control table.

Every actual species change still records its timestamp. Same-species retries
do not reset it. The authenticated status RPC returns no deadline while paused;
the separate read-only flag RPC allows the UI to describe this accurately.

To restore seven days, apply `cat-coat-cooldown-restore-seven-days.sql`.
The next allowed change becomes the latest actual change plus exactly 168 hours.
Do not reapply the temporary-unlock script after restoring unless another
explicit temporary pause is intended. Neither script changes night dates,
06:00 boundaries, posts, history, totals or other access controls.

Verification: `test-cat-coat-unlock-sql.cjs` checks pause and restoration locally;
`test-cat-coat-unlock-live.js` checks the live paused state without restoring it.
