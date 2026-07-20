/* עמוד הצפייה בטפסים שהתקבלו.
 *
 * הקריאה מהטבלה מותרת רק למשתמש מחובר (RLS), ולכן העמוד מבצע התחברות
 * מול Supabase Auth ומשתמש ב-access token של המשתמש - ולא במפתח האנונימי. */

'use strict';

const $ = (sel) => document.querySelector(sel);
const SESSION_KEY = 'kashev:session';

let session = null;     // { access_token, refresh_token, expires_at }
let rows = [];

/* ---------------- ניהול התחברות ---------------- */

function storeSession(s) {
  session = {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    // שומרים רגע תפוגה מוחלט כדי לדעת מתי לרענן
    expires_at: Date.now() + (s.expires_in || 3600) * 1000
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { }
}

function clearSession() {
  session = null;
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { }
}

function loadSession() {
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { session = null; }
  return session;
}

async function authRequest(grant, body) {
  const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=' + grant, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || ('HTTP ' + res.status));
  return data;
}

async function login(email, password) {
  storeSession(await authRequest('password', { email, password }));
}

async function refresh() {
  if (!session || !session.refresh_token) throw new Error('אין חיבור פעיל');
  storeSession(await authRequest('refresh_token', { refresh_token: session.refresh_token }));
}

/* ---------------- שליפת הנתונים ---------------- */

async function fetchRows() {
  if (session && Date.now() > session.expires_at - 60000) await refresh();

  const url = SUPABASE_URL + '/rest/v1/' + TABLE +
              '?select=*&order=created_at.desc';
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + session.access_token
    }
  });

  if (res.status === 401) {           // הטוקן פג - ניסיון רענון אחד
    await refresh();
    return fetchRows();
  }
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()));
  return res.json();
}

/* ---------------- תצוגה ---------------- */

function fmtWhen(iso) {
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() +
         ' בשעה ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function renderList() {
  const root = $('#list-root');
  root.innerHTML = '';
  $('#list-count').textContent = rows.length ? rows.length + ' טפסים' : '';
  $('#list-empty').style.display = rows.length ? 'none' : '';

  rows.forEach((r, i) => {
    const done = r.answered_count >= r.total_items;
    const b = document.createElement('button');
    b.className = 'pick';
    b.innerHTML =
      '<span class="pick-title">' + esc(r.child_name) + '</span>' +
      '<span class="pick-sub">' +
        (r.form_type === 'staff' ? 'צוות חינוכי' : 'הורים') +
        (r.filler_name ? ' - ' + esc(r.filler_name) : '') +
        '<br>התקבל ' + fmtWhen(r.created_at) +
        ' | ' + r.answered_count + '/' + r.total_items + ' שאלות' +
        (done ? '' : ' <b>(חלקי)</b>') +
      '</span>';
    b.addEventListener('click', () => openOne(i));
    root.appendChild(b);
  });
}

function rowToData(r) {
  return {
    meta: { child: r.child_name, date: r.form_date, filler: r.filler_name },
    answers: r.answers || {},
    free: r.free_text || {}
  };
}

let current = null;

function openOne(i) {
  current = rows[i];
  $('#one-title').textContent = current.child_name;
  $('#one-sub').textContent =
    (current.form_type === 'staff' ? 'צוות חינוכי' : 'הורים') +
    ' | התקבל ' + fmtWhen(current.created_at);

  // אותה תצוגה בדיוק שממנה מופק ה-PDF
  const pv = document.createElement('div');
  pv.className = 'pv pv-inline';
  pv.innerHTML = buildPrintHtml(rowToData(current), current.form_type,
    'התקבל דרך הטופס המקוון בתאריך ' + formatDate(current.created_at) + '.');
  $('#one-body').innerHTML = '';
  $('#one-body').appendChild(pv);

  show('screen-one');
}

function pdfName() {
  const child = (current.child_name || 'ללא שם').replace(/[\\/:*?"<>|]/g, '');
  const who = current.form_type === 'staff' ? 'צוות חינוכי' : 'הורים';
  return 'שאלון קשב - ' + child + ' - ' + who;
}

function exportPdf() {
  const pv = document.createElement('div');
  pv.className = 'pv';
  pv.innerHTML = buildPrintHtml(rowToData(current), current.form_type,
    'התקבל דרך הטופס המקוון בתאריך ' + formatDate(current.created_at) + '.');
  $('#print-root').innerHTML = '';
  $('#print-root').appendChild(pv);
  document.title = pdfName();
  window.print();
}

window.addEventListener('afterprint', () => {
  document.title = 'שאלוני קשב - צפייה';
  $('#print-root').innerHTML = '';
});

/* ---------------- מסכים ---------------- */

function show(id) {
  ['screen-login', 'screen-list', 'screen-one']
    .forEach(s => $('#' + s).classList.toggle('hidden', s !== id));
  window.scrollTo(0, 0);
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

async function showList() {
  try {
    rows = await fetchRows();
    renderList();
    show('screen-list');
  } catch (e) {
    console.error(e);
    clearSession();
    show('screen-login');
    toast('ההתחברות פגה, נא להתחבר מחדש.');
  }
}

/* ---------------- אתחול ---------------- */

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#btn-login');
  const err = $('#login-err');
  err.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'מתחבר...';
  try {
    await login($('#email').value.trim(), $('#password').value);
    $('#password').value = '';
    await showList();
  } catch (ex) {
    err.textContent = 'ההתחברות נכשלה: ' + ex.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'כניסה';
  }
});

$('#btn-logout').addEventListener('click', () => {
  clearSession();
  show('screen-login');
});
$('#btn-back').addEventListener('click', () => show('screen-list'));
$('#btn-pdf').addEventListener('click', exportPdf);

if (loadSession()) showList();
else show('screen-login');
