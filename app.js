/* שאלון הערכה להפרעת קשב לפי DSM-V - גרסת מובייל
   הכל רץ בדפדפן. שום נתון לא נשלח לשרת. */

'use strict';

/* ---------------- נתוני השאלון ---------------- */

const GROUPS = [
  {
    key: 'inattention',
    title: 'חוסר קשב',
    items: [
      'לא מצליח לשים לב לפרטים, עושה טעויות בשל חוסר תשומת לב',
      'מתקשה להתמיד להתרכז בפעילות למידה או משחק',
      'לעיתים קרובות נראה שלא מקשיב כשמדברים אליו',
      'לעיתים קרובות לא ממלא אחר הוראות, לא מסיים שיעורי בית או מטלות',
      'מתקשה להתארגן לביצוע עבודות ופעילויות',
      'מתחמק מפעילויות המצריכות ריכוז או מאמץ מחשבתי מתמשך',
      'מאבד חפצים',
      'מוסח בקלות ע"י גירויים חיצוניים',
      'שכחן לגבי פעילויות יום-יומיות'
    ]
  },
  {
    key: 'hyper',
    title: 'פעילות יתר',
    startNum: 1,
    items: [
      'מרבה להניע ידיים, רגליים, נע על כסאו',
      'מתקשה להתמיד בישיבה בנסיבות המחייבות ישיבה (בכיתה, בארוחה וכו\')',
      'מתרוצץ מסביב או מטפס במצבים בהם זה לא מתאים',
      'מתקשה להעסיק את עצמו בפעילויות שקטות',
      'תמיד בתנועה, כאילו מונע ע"י מנוע פנימי',
      'דברן'
    ]
  },
  {
    key: 'impulse',
    title: 'אימפולסיביות',
    startNum: 7,
    items: [
      '"יורה" תשובות עוד בטרם הושלמה השאלה',
      'מתקשה להמתין לתורו',
      'מפריע או פולש לאחרים (כשהם באמצע שיחה או משחק)'
    ]
  }
];

const OPTIONS = ['לא', 'לפעמים', 'בדרך כלל'];

const FREE_FIELDS = [
  { name: 't_academic', label: '1. הישגים לימודיים' },
  { name: 't_tasks',    label: '2. עמידה במטלות' },
  { name: 't_social',   label: '3. מצב חברתי' },
  { name: 't_behavior', label: '4. התנהגות' },
  { name: 't_notes',    label: 'הערות נוספות' }
];

const TOTAL_ITEMS = GROUPS.reduce((n, g) => n + g.items.length, 0);

/* ---------------- מצב ---------------- */

let formType = null;          // 'staff' | 'parent'
let locked = false;

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

function esc(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ---------------- שמירה וטעינה ---------------- */

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
    localStorage.setItem(storeKey(), JSON.stringify({ locked, data: collect() }));
  } catch (e) { /* מצב פרטי בדפדפן - ממשיכים בלי שמירה */ }
}

function load() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storeKey()) || 'null'); } catch (e) { }
  if (!saved) return false;

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
  return !!saved.locked;
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

/* ---------------- נעילה ---------------- */

function applyLockState() {
  document.querySelectorAll('#the-form input, #the-form textarea')
    .forEach(el => { el.disabled = locked; });

  $('#locked-banner').classList.toggle('hidden', !locked);
  $('#btn-lock').classList.toggle('hidden', locked);
  $('#btn-pdf').classList.toggle('hidden', !locked);
  $('#btn-unlock').classList.toggle('hidden', !locked);

  const canShare = locked && navigator.canShare &&
    navigator.canShare({ files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] });
  $('#btn-share').classList.toggle('hidden', !canShare);
}

function doLock() {
  const missing = TOTAL_ITEMS - answeredCount();
  if (!$('#child').value.trim()) {
    toast('נא למלא את שם הילד/ה');
    $('#child').focus();
    return;
  }
  const msg = missing > 0
    ? 'נותרו ' + missing + ' שאלות ללא מענה.\nלנעול את הטופס בכל זאת?'
    : 'לנעול את הטופס? לאחר הנעילה לא ניתן לערוך אותו.';
  if (!confirm(msg)) return;

  locked = true;
  save();
  applyLockState();
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('הטופס ננעל. ניתן להוריד PDF.');
}

function doUnlock() {
  if (!confirm('לבטל את הנעילה ולאפשר עריכה מחדש?')) return;
  locked = false;
  save();
  applyLockState();
  updateProgress();
  toast('הנעילה בוטלה.');
}

/* ---------------- תצוגת ההדפסה ---------------- */

function buildPrintView() {
  const d = collect();
  const isStaff = formType === 'staff';
  const pv = document.createElement('div');
  pv.className = 'pv';

  let html = '';
  html += '<h1>שאלון הערכה להפרעת קשב לפי DSM-V</h1>';
  html += '<p class="pv-sub">' + (isStaff ? 'שאלון לצוות החינוכי' : 'שאלון להורים') + '</p>';

  html += '<div class="pv-meta">';
  html += '<div><b>שם הילד/ה:</b> ' + esc(d.meta.child || '-') + '</div>';
  html += '<div><b>תאריך:</b> ' + esc(formatDate(d.meta.date)) + '</div>';
  html += '<div><b>' + (isStaff ? 'ממלא/ת השאלון:' : 'שם ההורה:') + '</b> ' +
          esc(d.meta.filler || '-') + '</div>';
  html += '</div>';

  if (isStaff) {
    html += '<h2>תיאור מצב הילד/ה</h2>';
    FREE_FIELDS.forEach(f => {
      html += '<div class="pv-free"><b>' + esc(f.label) + '</b><p>' +
              esc(d.free[f.name] || '') + '</p></div>';
    });
  }

  GROUPS.forEach(g => {
    html += '<h2>' + esc(g.title) + '</h2>';
    html += '<table><thead><tr><th>#</th><th>הפריט</th>';
    OPTIONS.forEach(o => { html += '<th class="c">' + esc(o) + '</th>'; });
    html += '</tr></thead><tbody>';
    g.items.forEach((text, i) => {
      const num = (g.startNum || 1) + i;
      const val = d.answers[g.key + '_' + num];
      html += '<tr><td class="c" style="width:26px">' + num + '</td><td>' + esc(text) + '</td>';
      OPTIONS.forEach(o => {
        const on = val === o;
        html += '<td class="c' + (on ? ' mark' : '') + '">' + (on ? 'X' : '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
  });

  const unanswered = TOTAL_ITEMS - Object.values(d.answers).filter(Boolean).length;
  html += '<p class="pv-foot">' +
    (unanswered ? 'שים לב: ' + unanswered + ' פריטים נותרו ללא מענה. ' : '') +
    'הטופס מולא ונחתם דיגיטלית בתאריך ' + todayStr() + '.</p>';

  pv.innerHTML = html;

  const root = $('#print-root');
  root.innerHTML = '';
  root.appendChild(pv);
  return pv;
}

function formatDate(iso) {
  if (!iso) return '-';
  const p = iso.split('-');
  return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso;
}

function todayStr() {
  const t = new Date();
  const p = n => String(n).padStart(2, '0');
  return p(t.getDate()) + '.' + p(t.getMonth() + 1) + '.' + t.getFullYear();
}

/* ---------------- יצירת PDF ---------------- */

const MARGIN_PT = 28;
const A4_W = 595.28, A4_H = 841.89;
const PV_W = 794;                                  // רוחב תצוגת ההדפסה בפיקסלים
const PT_PER_PX = (A4_W - 2 * MARGIN_PT) / PV_W;   // יחס המרה
const PAGE_H_PX = (A4_H - 2 * MARGIN_PT) / PT_PER_PX;

function breakPoints(pv) {
  const base = pv.getBoundingClientRect().top;
  const els = pv.querySelectorAll('tr, .pv-free, h2, .pv-meta');
  return Array.from(els).map(el => el.getBoundingClientRect().top - base);
}

async function makePdf() {
  const pv = buildPrintView();
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  const canvas = await html2canvas(pv, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: PV_W
  });

  const scale = canvas.width / PV_W;            // פיקסלים בקנבס לכל פיקסל CSS
  const totalCss = canvas.height / scale;
  const breaks = breakPoints(pv);

  const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  let start = 0, first = true;

  while (start < totalCss - 1) {
    let end = start + PAGE_H_PX;
    if (end >= totalCss) {
      end = totalCss;
    } else {
      const cand = breaks.filter(t => t > start + 60 && t <= end);
      if (cand.length) end = Math.max.apply(null, cand);
    }

    const sliceCss = end - start;
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.round(sliceCss * scale);
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, Math.round(start * scale), canvas.width, slice.height,
                          0, 0, canvas.width, slice.height);

    if (!first) doc.addPage();
    first = false;
    doc.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG',
      MARGIN_PT, MARGIN_PT, A4_W - 2 * MARGIN_PT, sliceCss * PT_PER_PX);

    start = end;
  }

  $('#print-root').innerHTML = '';
  return doc;
}

function pdfName() {
  const child = ($('#child').value.trim() || 'ללא שם').replace(/[\\/:*?"<>|]/g, '');
  const who = formType === 'staff' ? 'צוות חינוכי' : 'הורים';
  return 'שאלון קשב - ' + child + ' - ' + who + '.pdf';
}

async function withBusy(btn, label, fn) {
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = label;
  try {
    await fn();
  } catch (e) {
    console.error(e);
    toast('אירעה שגיאה ביצירת ה-PDF. נסו שוב.');
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

/* אם ספריות ה-PDF לא נטענו, נופלים חזרה להדפסת הדפדפן ("שמור כ-PDF") */
function libsReady() {
  return typeof window.html2canvas === 'function' && window.jspdf && window.jspdf.jsPDF;
}

function printFallback() {
  buildPrintView();
  toast('בחרו "שמירה כ-PDF" בחלון ההדפסה.');
  setTimeout(() => {
    window.print();
    setTimeout(() => { $('#print-root').innerHTML = ''; }, 500);
  }, 400);
}

function downloadPdf() {
  if (!libsReady()) { printFallback(); return; }
  return withBusy($('#btn-pdf'), 'מכין PDF...', async () => {
    const doc = await makePdf();
    doc.save(pdfName());
    toast('ה-PDF נשמר במכשיר.');
  });
}

function sharePdf() {
  if (!libsReady()) { printFallback(); return; }
  return withBusy($('#btn-share'), 'מכין PDF...', async () => {
    const doc = await makePdf();
    const blob = doc.output('blob');
    const file = new File([blob], pdfName(), { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'שאלון הערכה להפרעת קשב' });
    } else {
      doc.save(pdfName());
    }
  });
}

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
  locked = load();

  applyLockState();
  updateProgress();

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
$('#btn-pdf').addEventListener('click', downloadPdf);
$('#btn-share').addEventListener('click', sharePdf);

$('#the-form').addEventListener('input', () => { if (!locked) { save(); updateProgress(); } });
$('#the-form').addEventListener('change', () => { if (!locked) { save(); updateProgress(); } });
$('#the-form').addEventListener('submit', e => e.preventDefault());

if (location.hash === '#staff' || location.hash === '#parent') {
  openForm(location.hash.slice(1));
}
