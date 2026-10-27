-- Create recommendations table
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations" ON public.recommendations
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert their own recommendations" ON public.recommendations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

CREATE INDEX idx_recommendations_recipient ON public.recommendations(recipient_id);
CREATE INDEX idx_recommendations_content ON public.recommendations(content_id);

-- Add recommendation_id to user_list_items (nullable, existing rows unaffected)
ALTER TABLE public.user_list_items
  ADD COLUMN recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE SET NULL;

-- Widen notifications type constraint to include 'recommendation'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'tagged', 'follow', 'reply', 'recommendation'));

-- send_recommendation RPC: SECURITY DEFINER to bypass RLS for cross-user list writes
CREATE OR REPLACE FUNCTION public.send_recommendation(
  p_recipient_id UUID,
  p_content_id INTEGER,
  p_message TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_rec_id UUID;
  v_list_id UUID;
  v_pos INTEGER;
BEGIN
  IF v_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot recommend to yourself';
  END IF;

  INSERT INTO recommendations (sender_id, recipient_id, content_id, message)
    VALUES (v_sender_id, p_recipient_id, p_content_id, p_message)
    RETURNING id INTO v_rec_id;

  SELECT id INTO v_list_id FROM user_lists
    WHERE user_id = p_recipient_id AND name = 'Friend Recommendations'
    LIMIT 1;

  IF v_list_id IS NULL THEN
    INSERT INTO user_lists (user_id, name, icon_name, is_public)
      VALUES (p_recipient_id, 'Friend Recommendations', 'person.2.fill', false)
      RETURNING id INTO v_list_id;
  END IF;

  SELECT COALESCE(MAX(position) + 1, 0) INTO v_pos
    FROM user_list_items WHERE list_id = v_list_id;

  INSERT INTO user_list_items (list_id, content_id, position, recommendation_id)
    VALUES (v_list_id, p_content_id, v_pos, v_rec_id)
    ON CONFLICT (list_id, content_id) DO UPDATE SET recommendation_id = EXCLUDED.recommendation_id;

  RETURN v_rec_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_recommendation(UUID, INTEGER, TEXT) TO authenticated;
