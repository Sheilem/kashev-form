-- טבלת התשובות של שאלון הקשב.
-- הוחלה על פרויקט exodus-run-schedule (omrdtxxbzwakanhnepnp) כמיגרציה
-- בשם kashev_submissions. הקובץ נשמר כאן לתיעוד ולהרצה חוזרת בטוחה.
--
-- מודל ההרשאות, בכוונה מצומצם:
--   anon          - רשאי להכניס שורה בלבד. אין לו הרשאת קריאה, ולכן
--                   המפתח האנונימי שמוטמע בטופס הציבורי אינו יכול לשלוף
--                   שום תשובה, גם לא את זו שהוא עצמו כתב.
--   authenticated - הקריאה מוגבלת למשתמש בודד (גל) ולא לכל משתמש מחובר.
--                   בפרויקט הזה יש עוד משתמשים אמיתיים, ובלי ההגבלה
--                   הזו כל אחד מהם היה יכול לשלוף מידע רפואי על ילד.
--
-- שים לב: הכנסה פתוחה לאנונימי פירושה שמי שיודע את הכתובת יכול לשלוח
-- טפסים מזויפים. עבור שאלון אחד זה מקובל; אם זה יהפוך למטרד, הדרך הנקייה
-- היא להעביר את ההכנסה ל-Edge Function עם סוד משותף.

create extension if not exists pgcrypto;

create table if not exists public.kashev_submissions (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  form_type      text        not null check (form_type in ('staff', 'parent')),
  child_name     text        not null,
  form_date      date,
  filler_name    text,
  answers        jsonb       not null default '{}'::jsonb,
  free_text      jsonb       not null default '{}'::jsonb,
  answered_count integer     not null default 0,
  total_items    integer     not null default 18
);

create index if not exists kashev_submissions_created_at_idx
  on public.kashev_submissions (created_at desc);

alter table public.kashev_submissions enable row level security;

drop policy if exists kashev_anon_can_insert   on public.kashev_submissions;
drop policy if exists kashev_authed_can_select on public.kashev_submissions;
drop policy if exists kashev_owner_can_select  on public.kashev_submissions;

create policy kashev_anon_can_insert
  on public.kashev_submissions
  for insert to anon
  with check (true);

create policy kashev_owner_can_select
  on public.kashev_submissions
  for select to authenticated
  using ((select auth.uid()) = 'f2f36808-7a36-4e7b-92c1-396222c9e756');

-- הרשאות ברירת המחדל בפרויקט מעניקות ל-anon ול-authenticated הכל
-- (כולל UPDATE/DELETE/TRUNCATE) על טבלאות חדשות, ולכן חייבים לשלול
-- במפורש לפני שמעניקים. אחרת RLS לבדו חוסם, ותקלה יחידה בו חושפת הכל.
revoke all on public.kashev_submissions from anon;
revoke all on public.kashev_submissions from authenticated;

-- PostgREST בודק גם הרשאות ברמת הטבלה, לא רק RLS
grant insert on public.kashev_submissions to anon;           -- שליחת טופס
grant select on public.kashev_submissions to authenticated;  -- עמוד הצפייה

-- לא ניתנת ל-anon הרשאת select, ולכן הטופס חייב לשלוח
-- Prefer: return=minimal (ב-supabase-js: insert בלי select)
