-- Number of rankings per user, counted in the database.
-- The leaderboard used to download every ranking row and count them in the app, but a
-- request returns at most 1,000 rows, so once the table grew past that the counts were wrong.
-- Runs with the caller's permissions; rankings are readable by everyone already.

CREATE OR REPLACE FUNCTION public.ranking_counts()
RETURNS TABLE (user_id UUID, rankings_count BIGINT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT r.user_id, COUNT(*) AS rankings_count
  FROM rankings r
  GROUP BY r.user_id
  ORDER BY rankings_count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.ranking_counts() TO anon, authenticated;
