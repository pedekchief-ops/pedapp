-- ============================================================================
-- 0016_feedback.sql
--
-- "משוב/הצעות/הערות": a floating button on every page (see
-- components/feedback/FeedbackButton.tsx, mounted once in AppChrome.tsx)
-- lets any signed-in user leave free-text feedback, with an optional name.
-- Admins see every submission in a "תיבת משובים" on /admin (see
-- components/admin/FeedbackInbox.tsx).
-- ============================================================================

create table public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  -- Optional, exactly as asked -- the submitter's account is still
  -- captured below regardless, so an admin following up on an unsigned
  -- submission isn't completely in the dark about who sent it.
  name text,
  message text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.feedback_submissions enable row level security;

create policy "feedback_submissions: insert authenticated" on public.feedback_submissions
  for insert with check (auth.role() = 'authenticated');

create policy "feedback_submissions: admin read" on public.feedback_submissions
  for select using (public.is_admin());
