-- טבלת התשובות של שאלון הקשב, בפרויקט Hasifa (ntmswvkcnlojksyypquc).
--
-- מודל ההרשאות, בכוונה מצומצם:
--   anon          - רשאי להכניס שורה בלבד. אין לו הרשאת קריאה, ולכן
--                   המפתח האנונימי שמוטמע בטופס הציבורי אינו יכול לשלוף
--                   שום תשובה, גם לא את זו שהוא עצמו כתב.
--   authenticated - רשאי לקרוא. זה המסלול של עמוד הצפייה, אחרי התחברות.
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

-- מחיקה ויצירה מחדש כדי שהקובץ יהיה בטוח להרצה חוזרת
drop policy if exists kashev_anon_can_insert   on public.kashev_submissions;
drop policy if exists kashev_authed_can_select on public.kashev_submissions;

create policy kashev_anon_can_insert
  on public.kashev_submissions
  for insert to anon
  with check (true);

create policy kashev_authed_can_select
  on public.kashev_submissions
  for select to authenticated
  using (true);

-- PostgREST בודק גם הרשאות ברמת הטבלה, לא רק RLS
grant insert on public.kashev_submissions to anon;
grant select on public.kashev_submissions to authenticated;

-- לא ניתנת ל-anon הרשאת select, ולכן הטופס חייב לשלוח
-- Prefer: return=minimal (ב-supabase-js: insert בלי select)
