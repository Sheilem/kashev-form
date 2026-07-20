/* שאלון הערכה להפרעת קשב לפי DSM-V - גרסת מובייל
 *
 * המילוי נשמר במכשיר תוך כדי עבודה. בעת הנעילה התשובות נשלחות פעם אחת
 * לשרת, וגם ניתן להפיק מהן PDF דרך הדפסת הדפדפן.
 * תוכן השאלון ותצוגת ההדפסה יושבים ב-questionnaire.js. */

'use strict';

let formType = null;          // 'staff' | 'parent'
let locked = false;
let sent = false;             // האם התשובות כבר נקלטו בשרת

const $ = (sel) => document.querySelector(sel);
const storeKey = () => 'kashev:' + formType;

/* ---------------- בניית סולם הדירוג ---------------- */

function buildScale() {
  const root = $('#scale-root');
  root.innerHTML = '';

  GROUPS.forEach(group => {
    const card = document.createElement('div');
    card.className = 'card';

    const h = document.createElement('p');
    h.className = 'group-title';
    h.innerHTML = group.title +
      ' <span class="group-count">(' + group.items.length + ' פריטים)</span>';
    card.appendChild(h);

    group.items.forEach((text, i) => {
      const num = (group.startNum || 1) + i;
      const qid = group.key + '_' + num;

      const q = document.createElement('div');
      q.className = 'q';

      const label = document.createElement('div');
      label.className = 'q-text';
      label.innerHTML = '<span class="q-num">' + num + '.</span><span>' + esc(text) + '</span>';
      q.appendChild(label);

      const opts = document.createElement('div');
      opts.className = 'opts';
      OPTIONS.forEach((opt, oi) => {
        const inputId = qid + '_' + oi;
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = qid;
        input.value = opt;
        input.id = inputId;

        const lab = document.createElement('label');
        lab.setAttribute('for', inputId);
        lab.textContent = opt;

        opts.appendChild(input);
        opts.appendChild(lab);
      });
      q.appendChild(opts);
      card.appendChild(q);
    });

    root.appendChild(card);
  });
}

/* ---------------- שמירה וטעינה מקומית ---------------- */

function collect() {
  const data = { answers: {}, meta: {}, free: {} };
  ['child', 'date', 'filler'].forEach(k => { data.meta[k] = $('#' + k).value.trim(); });
  FREE_FIELDS.forEach(f => {
    const el = document.querySelector('[name="' + f.name + '"]');
    data.free[f.name] = el ? el.value.trim() : '';
  });
  GROUPS.forEach(g => g.items.forEach((_, i) => {
    const num = (g.startNum || 1) + i;
    const qid = g.key + '_' + num;
    const sel = document.querySelector('input[name="' + qid + '"]:checked');
    data.answers[qid] = sel ? sel.value : '';
  }));
  return data;
}

function save() {
  try {
    localStorage.setItem(storeKey(), JSON.stringify({ locked, sent, data: collect() }));
  } catch (e) { /* מצב פרטי בדפדפן - ממשיכים בלי שמירה */ }
}

function load() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storeKey()) || 'null'); } catch (e) { }
  if (!saved) return { locked: false, sent: false };

  const d = saved.data || {};
  Object.entries(d.meta || {}).forEach(([k, v]) => { const el = $('#' + k); if (el) el.value = v; });
  Object.entries(d.free || {}).forEach(([k, v]) => {
    const el = document.querySelector('[name="' + k + '"]'); if (el) el.value = v;
  });
  Object.entries(d.answers || {}).forEach(([qid, val]) => {
    if (!val) return;
    const el = document.querySelector('input[name="' + qid + '"][value="' + val + '"]');
    if (el) el.checked = true;
  });
  return { locked: !!saved.locked, sent: !!saved.sent };
}

/* ---------------- התקדמות ---------------- */

function answeredCount() {
  return Object.values(collect().answers).filter(Boolean).length;
}

function updateProgress() {
  const n = answeredCount();
  const pct = Math.round(n / TOTAL_ITEMS * 100);
  $('#progress-bar').style.width = pct + '%';
  $('#progress-text').textContent = n + ' מתוך ' + TOTAL_ITEMS + ' שאלות (' + pct + '%)';
  $('#btn-lock').disabled = locked;
}

/* ---------------- שליחה לשרת ---------------- */

async function sendToServer() {
  const d = collect();
  const payload = {
    form_type: formType,
    child_name: d.meta.child,
    form_date: d.meta.date || null,
    filler_name: d.meta.filler || null,
    answers: d.answers,
    free_text: formType === 'staff' ? d.free : {},
    answered_count: Object.values(d.answers).filter(Boolean).length,
    total_items: TOTAL_ITEMS
  };

  const res = await fetch(SUPABASE_URL + '/rest/v1/' + TABLE, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      // ל-anon אין הרשאת קריאה, ולכן אסור לבקש את השורה בחזרה
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()));
}

function setSendStatus(state, msg) {
  const el = $('#send-status');
  el.className = 'send-status ' + state;
  el.innerHTML = msg;
  el.classList.remove('hidden');
}

async function trySend() {
  if (sent) return;
  setSendStatus('pending', 'שולח את התשובות...');
  try {
    await sendToServer();
    sent = true;
    save();
    setSendStatus('ok', '<b>התשובות נשלחו בהצלחה.</b> אפשר לסגור את העמוד.');
  } catch (e) {
    console.error(e);
    setSendStatus('err',
      '<b>השליחה לא הצליחה.</b> בדקו את החיבור לאינטרנט ונסו שוב, ' +
      'או הפיקו PDF ושלחו אותו ידנית.' +
      '<button type="button" id="btn-retry">נסו שוב</button>');
    $('#btn-retry').addEventListener('click', trySend);
  }
}

/* ---------------- נעילה ---------------- */

function applyLockState() {
  document.querySelectorAll('#the-form input, #the-form textarea')
    .forEach(el => { el.disabled = locked; });

  $('#locked-banner').classList.toggle('hidden', !locked);
  $('#btn-lock').classList.toggle('hidden', locked);
  $('#btn-pdf').classList.toggle('hidden', !locked);
  $('#pdf-hint').classList.toggle('hidden', !locked);
  $('#btn-unlock').classList.toggle('hidden', !locked);
  if (!locked) $('#send-status').classList.add('hidden');
}

function doLock() {
  if (!$('#child').value.trim()) {
    toast('נא למלא את שם הילד/ה');
    $('#child').focus();
    return;
  }
  const missing = TOTAL_ITEMS - answeredCount();
  const msg =
    (missing > 0 ? 'נותרו ' + missing + ' שאלות ללא מענה.\n\n' : '') +
    'בסיום הטופס יינעל והתשובות יישלחו. להמשיך?';
  if (!confirm(msg)) return;

  locked = true;
  save();
  applyLockState();
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  trySend();
}

function doUnlock() {
  if (!confirm('לבטל את הנעילה ולאפשר עריכה מחדש?\n\n' +
               'שים לב: אם התשובות כבר נשלחו, עריכה ונעילה מחדש ישלחו אותן שוב.')) return;
  locked = false;
  sent = false;
  save();
  applyLockState();
  updateProgress();
  toast('הנעילה בוטלה.');
}

/* ---------------- הפקת PDF דרך הדפסת הדפדפן ---------------- */

function buildPrintView() {
  const pv = document.createElement('div');
  pv.className = 'pv';
  pv.innerHTML = buildPrintHtml(collect(), formType,
    'הטופס מולא ונחתם דיגיטלית בתאריך ' + todayStr() + '.');
  const root = $('#print-root');
  root.innerHTML = '';
  root.appendChild(pv);
  return pv;
}

function pdfName() {
  const child = ($('#child').value.trim() || 'ללא שם').replace(/[\\/:*?"<>|]/g, '');
  const who = formType === 'staff' ? 'צוות חינוכי' : 'הורים';
  return 'שאלון קשב - ' + child + ' - ' + who;
}

const PAGE_TITLE = 'שאלון הערכה להפרעת קשב';

function exportPdf() {
  buildPrintView();
  document.title = pdfName();
  window.print();
}

window.addEventListener('afterprint', () => {
  document.title = PAGE_TITLE;
  $('#print-root').innerHTML = '';
});

/* ---------------- הודעות ---------------- */

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

/* ---------------- ניווט ---------------- */

function openForm(type) {
  formType = type;
  const isStaff = type === 'staff';

  $('#form-title').textContent = isStaff ? 'שאלון לצוות החינוכי' : 'שאלון להורים';
  $('#filler-label').textContent = isStaff ? 'שם הממלא/ת ותפקיד' : 'שם ההורה';
  $('#filler').placeholder = isStaff ? 'לדוגמה: רונית לוי, מחנכת כיתה ב\'' : 'שם מלא';
  $('#staff-text').classList.toggle('hidden', !isStaff);
  $('#parent-info').classList.toggle('hidden', isStaff);

  buildScale();

  if (!$('#date').value) $('#date').value = new Date().toISOString().slice(0, 10);

  const st = load();
  locked = st.locked;
  sent = st.sent;

  applyLockState();
  updateProgress();
  if (locked && sent) {
    setSendStatus('ok', '<b>התשובות נשלחו בהצלחה.</b> אפשר לסגור את העמוד.');
  } else if (locked && !sent) {
    trySend();
  }

  $('#screen-pick').classList.add('hidden');
  $('#screen-form').classList.remove('hidden');
  window.scrollTo(0, 0);
  location.hash = type;
}

function goBack() {
  save();
  $('#screen-form').classList.add('hidden');
  $('#screen-pick').classList.remove('hidden');
  formType = null;
  history.replaceState(null, '', location.pathname);
  window.scrollTo(0, 0);
}

/* ---------------- אתחול ---------------- */

document.querySelectorAll('.pick').forEach(b =>
  b.addEventListener('click', () => openForm(b.dataset.form)));

$('#btn-back').addEventListener('click', goBack);
$('#btn-lock').addEventListener('click', doLock);
$('#btn-unlock').addEventListener('click', doUnlock);
$('#btn-pdf').addEventListener('click', exportPdf);

$('#the-form').addEventListener('input', () => { if (!locked) { save(); updateProgress(); } });
$('#the-form').addEventListener('change', () => { if (!locked) { save(); updateProgress(); } });
$('#the-form').addEventListener('submit', e => e.preventDefault());

if (location.hash === '#staff' || location.hash === '#parent') {
  openForm(location.hash.slice(1));
}
