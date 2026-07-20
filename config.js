/* פרטי החיבור ל-Supabase (פרויקט exodus-run-schedule).
 *
 * המפתח האנונימי נועד להיות ציבורי - RLS מגביל אותו להכנסת שורה
 * לטבלת kashev_submissions בלבד, ואין לו הרשאת קריאה לשום טבלה.
 * הקריאה מהטבלה מוגבלת למשתמש בודד, ולא לכל משתמש מחובר בפרויקט.
 * ראה supabase/kashev_submissions.sql. */

const SUPABASE_URL = 'https://omrdtxxbzwakanhnepnp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcmR0eHhiendha2FuaG5lcG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTA5NTgsImV4cCI6MjA5ODU2Njk1OH0.d_SCG2wYyrRnlGyqvot6DskRDluCci_OTBMkTNLUZNo';

const TABLE = 'kashev_submissions';
