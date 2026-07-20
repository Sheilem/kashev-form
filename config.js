/* פרטי החיבור ל-Supabase (פרויקט Hasifa).
 *
 * המפתח האנונימי נועד להיות ציבורי - הוא מוגבל ב-RLS להכנסת שורה
 * לטבלת kashev_submissions בלבד, ואין לו הרשאת קריאה לשום טבלה.
 * ראה supabase/kashev_submissions.sql. */

const SUPABASE_URL = 'https://ntmswvkcnlojksyypquc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXN3dmtjbmxvamtzeXlwcXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNTE4NDEsImV4cCI6MjA3OTgyNzg0MX0.j3gFjCb_g3K1KyztK1Bnm1fMdEuMSIu83CZcV7m-ZR4';

const TABLE = 'kashev_submissions';
