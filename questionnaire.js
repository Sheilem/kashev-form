/* תוכן השאלון ובניית תצוגת ההדפסה.
 * משותף לטופס עצמו (app.js) ולעמוד הצפייה (viewer.js), כדי שה-PDF
 * ייראה זהה בשני המקומות. */

'use strict';

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

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function formatDate(iso) {
  if (!iso) return '-';
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso;
}

/* d = { meta:{child,date,filler}, answers:{qid:value}, free:{name:text} } */
function buildPrintHtml(d, formType, stampText) {
  const isStaff = formType === 'staff';
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
              esc((d.free || {})[f.name] || '') + '</p></div>';
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
    esc(stampText || '') + '</p>';

  return html;
}

function todayStr() {
  const t = new Date();
  const p = n => String(n).padStart(2, '0');
  return p(t.getDate()) + '.' + p(t.getMonth() + 1) + '.' + t.getFullYear();
}
