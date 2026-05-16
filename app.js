/* ═══════════════════════════════════════════════
   KAORZIP — app.js
   Offline employee scheduling dashboard
   No backend • LocalStorage • Real Excel I/O
═══════════════════════════════════════════════ */
'use strict';

// ═══════════════════ CONSTANTS ═══════════════════

const STATUS_LABEL = {
  work:'Работает', '21':'Ночная смена', '9':'Изм. смены',
  ОТ:'Отпуск', БЛ:'Больничный', УО:'Уч. отпуск',
  ОЗ:'Отпуск б/с', НЯ:'Неявка', off:'Выходной',
};

const STATUS_COLOR = {
  work:'#3b82f6', '21':'#8b5cf6', '9':'#10b981',
  ОТ:'#64748b', БЛ:'#ef4444', УО:'#06b6d4',
  ОЗ:'#f97316', НЯ:'#dc2626', off:'#94a3b8',
};

const BREAK_COLORS = {
  'перерыв': '#f59e0b',
  'обед':    '#f97316',
  'ужин':    '#8b5cf6',
};

const LEGEND_ITEMS = [
  { label:'Рабочая смена',  color:'#3b82f6' },
  { label:'Ночная смена',   color:'#8b5cf6' },
  { label:'Изм. смены',     color:'#10b981' },
  { label:'Отпуск',         color:'#64748b' },
  { label:'Больничный',     color:'#ef4444' },
  { label:'Уч. отпуск',     color:'#06b6d4' },
  { label:'Отпуск б/с',     color:'#f97316' },
  { label:'Неявка',         color:'#dc2626' },
  { label:'Перерыв',        color:'#f59e0b' },
  { label:'Обед',           color:'#f97316' },
  { label:'Ужин',           color:'#8b5cf6' },
];

const COLORS_POOL = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
  '#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6',
  '#84cc16','#06b6d4','#a855f7','#f59e0b','#10b981',
];

const DAYS_RU  = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const DAYS_FULL= ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

// Timeline config
const TL_START  = 8 * 60;    // 08:00
const TL_END    = 22 * 60;   // 22:00
const TL_PX_MIN = 2;         // 2px / minute
const TL_HOUR_W = 60 * TL_PX_MIN;

// ═══════════════════ STATE ═══════════════════════

let S = {
  page:     'dashboard',
  date:     new Date(),
  theme:    'light',
  compact:  false,
  favorites:[],
  data:     [],      // schedule employees (from file 1)
  breaks:   [],      // break employees   (from file 2)
  sortCol:  'name',
  sortDir:  'asc',
  calYear:  null,
  calMonth: null,
  currentEmpId: null,
};
let _internalNav = false; // guard against hashchange loop

// ═══════════════════ LOCALSTORAGE ════════════════

const LS = {
  SCHEDULE: 'kz_schedule',
  BREAKS:   'kz_breaks',
  PREFS:    'kz_prefs',
};

function saveSchedule() {
  try { localStorage.setItem(LS.SCHEDULE, JSON.stringify(S.data)); } catch(e) { console.warn('LS save err', e); }
}
function saveBreaks() {
  try { localStorage.setItem(LS.BREAKS, JSON.stringify(S.breaks)); } catch(e) {}
}
function savePrefs() {
  try { localStorage.setItem(LS.PREFS, JSON.stringify({ theme: S.theme, compact: S.compact, favorites: S.favorites })); } catch(e) {}
}
function loadAll() {
  try {
    const sc = localStorage.getItem(LS.SCHEDULE);
    if (sc) S.data = JSON.parse(sc);
    const br = localStorage.getItem(LS.BREAKS);
    if (br) S.breaks = JSON.parse(br);
    const pr = localStorage.getItem(LS.PREFS);
    if (pr) { const p = JSON.parse(pr); Object.assign(S, { theme: p.theme||'light', compact: !!p.compact, favorites: p.favorites||[] }); }
  } catch(e) { console.warn('LS load err', e); }
}

// ═══════════════════ DATE UTILS ══════════════════

function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function pad(n) { return String(n).padStart(2,'0'); }
function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function sameDay(a,b) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function isToday(d) { return sameDay(d, new Date()); }
function formatDisp(d) { return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}, ${DAYS_FULL[d.getDay()]}`; }
function timeToMin(t) { if (!t) return 0; const [h,m]=(t||'').split(':').map(Number); return h*60+(m||0); }
function minToTime(m) { return `${pad(Math.floor(m/60)%24)}:${pad(m%60)}`; }

// ═══════════════════ DOM UTILS ═══════════════════

function el(id) { return document.getElementById(id); }
function qs(sel, ctx=document) { return ctx.querySelector(sel); }
function qsa(sel, ctx=document) { return [...ctx.querySelectorAll(sel)]; }
function setHTML(id, h) { const n=typeof id==='string'?el(id):id; if(n) n.innerHTML=h; }

function avatarHTML(name, color, size=32) {
  const ini = (name||'?').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color}22;color:${color};font-size:${Math.round(size*.33)}px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ini}</div>`;
}

function badge(status) {
  const cls = {work:'badge-work','21':'badge-night','9':'badge-changed',ОТ:'badge-vac',БЛ:'badge-sick',УО:'badge-study',ОЗ:'badge-unpaid',НЯ:'badge-absence',off:'badge-off'}[status]||'';
  return `<span class="badge ${cls}">${STATUS_LABEL[status]||status||'—'}</span>`;
}

// ═══════════════════ TOAST ═══════════════════════

function toast(msg, type='') {
  const t = document.createElement('div');
  t.className = `toast${type?' toast-'+type:''}`;
  t.textContent = msg;
  el('toastStack').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ═══════════════════ MODAL ═══════════════════════

function openModal(title, body) {
  el('modalTitle').textContent = title;
  setHTML('modalBody', body);
  el('modalBackdrop').classList.remove('hidden');
}
function closeModal() { el('modalBackdrop').classList.add('hidden'); }

// ═══════════════════ COLOR MAP ═══════════════════

function buildColorMap(employees) {
  const map = {};
  employees.forEach((e,i) => { map[e.name] = COLORS_POOL[i % COLORS_POOL.length]; });
  return map;
}

let COLOR_MAP = {};

// ═══════════════════════════════════════════════
// EXCEL PARSING — SCHEDULE FILE (FORMAT: 5 cols/day)
// ═══════════════════════════════════════════════

function parseExcelDate(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number' && v > 40000) {
    // Excel serial date — 25569 = days from 1900-01-01 to 1970-01-01
    return new Date(Math.round((v - 25569) * 864e5));
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!isNaN(d) && d.getFullYear() > 2000) return d;
  }
  return null;
}

function parseDayBlock(cells) {
  // cells = 5 values: [c1, c2, c3, c4, c5]
  const raw = cells.map(v => (v == null ? '' : String(v).trim()));
  const [c1, c2, c3, c4, c5] = raw;

  if (!c1 && !c2 && !c3) return { status: 'off', raw };

  // Special leave codes: "бл/11", "от/11", "уо/11", "оз/11", "ня/11"
  // or just "бл", "от", etc.
  const specRe = /^(бл|от|уо|оз|ня)(\/\d+)?$/i;
  const specMatch = c1.match(specRe) || c2.match(specRe) || c3.match(specRe);
  if (specMatch) {
    const codeMap = { бл:'БЛ', от:'ОТ', уо:'УО', оз:'ОЗ', ня:'НЯ' };
    const key = specMatch[1].toLowerCase();
    return { status: codeMap[key], raw };
  }

  const startN = parseInt(c1);
  if (isNaN(startN) || startN === 0) {
    // 0 = выходной
    if (c1 === '0' || (c1==='' && c2==='0')) return { status: 'off', raw };
    return { status: 'off', raw };
  }

  const endN   = parseInt(c2);
  const lunchN = parseInt(c3);
  const marker = parseInt(c5);

  // Night shift: start at 21
  if (startN === 21) {
    return {
      status: '21',
      shiftStart: '21:00',
      shiftEnd:   `${pad(endN)}:00`,
      lunchHour:  isNaN(lunchN) ? null : lunchN,
      raw,
    };
  }

  // Changed shift (marker=9) or regular
  const status = (marker === 9) ? '9' : 'work';

  return {
    status,
    shiftStart: `${pad(startN)}:00`,
    shiftEnd:   `${pad(endN)}:00`,
    lunchHour:  isNaN(lunchN) ? null : lunchN,
    raw,
  };
}

function parseScheduleWorkbook(wb) {
  const SKIP_SHEETS = ['обозначения', 'Обозначения', 'Legend', 'legend'];
  const employees = {};   // name → emp object
  const meta = { months: [] };

  for (const sheetName of wb.SheetNames) {
    if (SKIP_SHEETS.includes(sheetName)) continue;

    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    // Use raw:true to get numeric dates, raw cell values
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    if (!rows.length) continue;

    const hdr = rows[0] || [];

    // Find date columns: starting from col 7 (0-indexed), every 5 cols
    const dateCols = [];
    for (let c = 7; c < hdr.length; c++) {
      const d = parseExcelDate(hdr[c]);
      if (d && d.getFullYear() > 2020) {
        dateCols.push({ col: c, date: d });
        c += 4; // skip 4 more cols to next date
      }
    }

    if (!dateCols.length) continue;

    meta.months.push({
      sheetName,
      startDate: dateCols[0].date,
      endDate:   dateCols[dateCols.length-1].date,
      dateCols,
    });

    // Parse employee rows (skip row 0 = header)
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const name = String(row[0]||'').trim();
      if (!name || name.length < 2) continue;

      if (!employees[name]) {
        employees[name] = {
          name,
          rg:        String(row[1]||'').trim(),
          line:      String(row[2]||'').trim(),
          sv:        String(row[3]||'').trim(),
          hireDate:  String(row[4]||'').trim(),
          graphSurv: String(row[5]||'').trim(),
          shiftCode: String(row[6]||'').trim(),
          schedule:  {},
          color:     COLORS_POOL[Object.keys(employees).length % COLORS_POOL.length],
        };
      }

      const emp = employees[name];

      for (const { col, date } of dateCols) {
        const cells = (row.slice(col, col+5) || []).map(v => v==null ? '' : v);
        const dayData = parseDayBlock(cells);
        const dk = dateKey(date);
        // Only update if new data is non-off, or slot is empty
        if (!emp.schedule[dk] || dayData.status !== 'off' || emp.schedule[dk].status === 'off') {
          emp.schedule[dk] = dayData;
        }
      }
    }
  }

  const result = Object.values(employees);
  COLOR_MAP = buildColorMap(result);
  result.forEach(e => { e.color = COLOR_MAP[e.name]; });

  return { employees: result, meta };
}

// ═══════════════════════════════════════════════
// EXCEL PARSING — BREAKS FILE (10-min slots)
// ═══════════════════════════════════════════════

function parseBreaksWorkbook(wb) {
  const employees = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    if (!rows.length) continue;

    const hdr = rows[0] || [];
    // Time slots start from col 3 (0-indexed)
    const timeSlots = hdr.slice(3);

    // Row at index 1 is "Кол-во операторов" — skip
    const startRow = rows[1] && (String(rows[1][0]||'').toLowerCase().includes('кол') || rows[1][0]==='') ? 2 : 1;

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r] || [];
      const name = String(row[0]||'').trim();
      if (!name || name.length < 2) continue;

      const shift = String(row[1]||'').trim();  // e.g. "08:00–20:00"
      const sv    = String(row[2]||'').trim();

      // Parse break slots
      const breaks = [];
      let cur = null;

      for (let i = 0; i < timeSlots.length; i++) {
        const timeLabel = timeSlots[i];
        const val = String(row[3+i]||'').trim().toLowerCase();
        const type = val === 'перерыв' ? 'перерыв'
                   : val === 'обед'    ? 'обед'
                   : val === 'ужин'    ? 'ужин'
                   : null;

        if (type) {
          if (!cur || cur.type !== type) {
            if (cur) breaks.push(cur);
            cur = { start: timeLabel, end: addMinutesToStr(timeLabel, 10), type, sheetName };
          } else {
            cur.end = addMinutesToStr(timeLabel, 10);
          }
        } else {
          if (cur) { breaks.push(cur); cur = null; }
        }
      }
      if (cur) breaks.push(cur);

      employees.push({ name, shift, sv, breaks, sheetName });
    }
  }

  return employees;
}

function addMinutesToStr(timeStr, mins) {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [h,m] = timeStr.split(':').map(Number);
  const total = h*60 + m + mins;
  return `${pad(Math.floor(total/60)%24)}:${pad(total%60)}`;
}

// ═══════════════════════════════════════════════
// EXCEL EXPORT — SCHEDULE (faithful round-trip)
// ═══════════════════════════════════════════════

function buildDayBlockExport(sc) {
  if (!sc || sc.status === 'off') return ['','','','',''];

  // If we have the raw original values, return them unchanged
  if (sc.raw && sc.raw.some(v => v !== '')) {
    return sc.raw.map(v => v === '' ? '' : v);
  }

  // Reconstruct from parsed data
  const codeMap = { БЛ:'бл', ОТ:'от', УО:'уо', ОЗ:'оз', НЯ:'ня' };
  if (codeMap[sc.status]) {
    const code = `${codeMap[sc.status]}/11`;
    return [code, code, code, code, 0];
  }

  const sH = sc.shiftStart ? parseInt(sc.shiftStart) : '';
  const eH = sc.shiftEnd   ? parseInt(sc.shiftEnd)   : '';
  const lH = sc.lunchHour  || '';
  const c4 = sc.status === '21' ? 24 : eH;
  const c5 = sc.status === '9'  ? 9  : 0;

  return [sH, eH, lH, c4, c5];
}

function exportScheduleExcel() {
  if (!window.XLSX_AVAILABLE) { toast('SheetJS не загружен — нужен интернет', 'warning'); return; }
  if (!S.data.length) { toast('Нет данных для экспорта', 'warning'); return; }

  const wb = XLSX.utils.book_new();

  // Group schedule by month
  const monthMap = {};
  S.data.forEach(emp => {
    Object.entries(emp.schedule||{}).forEach(([dk, sc]) => {
      const d = parseDate(dk);
      if (!d) return;
      const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
      if (!monthMap[key]) monthMap[key] = { year: d.getFullYear(), month: d.getMonth(), days: new Set() };
      monthMap[key].days.add(d.getDate());
    });
  });

  const MONTH_NAMES_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  Object.entries(monthMap).sort().forEach(([mKey, info]) => {
    const { year, month } = info;
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const sheetName = `${MONTH_NAMES_RU[month]}_${String(year).slice(2)}`;

    // Build header row
    const hdrRow = ['ФИО','РГ','Линия/позиция','СВ','Дата приема','График сурв','Смена'];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      // Store as Excel serial date
      const serial = (dt.getTime() / 864e5) + 25569;
      hdrRow.push(serial, '', '', '', '');
    }

    // Build data rows
    const dataRows = [hdrRow];

    S.data.forEach(emp => {
      const row = [emp.name, emp.rg||'', emp.line||'', emp.sv||'', emp.hireDate||'', emp.graphSurv||'', emp.shiftCode||''];
      for (let d = 1; d <= daysInMonth; d++) {
        const dk = `${year}-${pad(month+1)}-${pad(d)}`;
        const sc = emp.schedule[dk] || { status: 'off' };
        row.push(...buildDayBlockExport(sc));
      }
      dataRows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(dataRows);

    // Format date cells in header
    const dateStyle = { numFmt: 'DD.MM.YYYY' };
    for (let d = 0; d < daysInMonth; d++) {
      const colIdx = 7 + d*5;
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (ws[cellAddr]) ws[cellAddr].t = 'n';
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Обозначения sheet
  const oznWs = XLSX.utils.aoa_to_sheet([
    ['Аббревиатура','Расшифровка','Как выглядит в рабочих сменах'],
    ['БЛ','Больничный','бл/11'],
    ['ОТ','Оплачиваемый отпуск','от/11'],
    ['УО','Учебный отпуск','уо/11'],
    ['ОЗ','Отпуск за свой счет','оз/11'],
    ['НЯ','Неявка','ня/11'],
    [],[],
    ['Цветовое обозначение','Расшифровка',''],
    [9,'Изменение смены (перенос, подмена)',''],
    [21,'Ночная смена',''],
  ]);
  XLSX.utils.book_append_sheet(wb, oznWs, 'обозначения');

  XLSX.writeFile(wb, `KAORZIP_Расписание_${dateKey(new Date())}.xlsx`);
  toast('✅ Расписание выгружено', 'success');
}

// ═══════════════════════════════════════════════
// EXCEL EXPORT — BREAKS (10-min slot format)
// ═══════════════════════════════════════════════

function exportBreaksExcel() {
  if (!window.XLSX_AVAILABLE) { toast('SheetJS не загружен', 'warning'); return; }
  if (!S.breaks.length) { toast('Нет данных перерывов', 'warning'); return; }

  const wb = XLSX.utils.book_new();

  // Group by sheet (day type)
  const sheetGroups = {};
  S.breaks.forEach(e => {
    const sn = e.sheetName || 'Дневные';
    if (!sheetGroups[sn]) sheetGroups[sn] = [];
    sheetGroups[sn].push(e);
  });

  Object.entries(sheetGroups).forEach(([sheetName, employees]) => {
    // Build time axis: 08:00 to 22:00 in 10-min steps
    const slots = [];
    for (let m = 8*60; m <= 22*60; m += 10) slots.push(minToTime(m));

    // Header row
    const hdr = ['ФИО','Смена','СВ', ...slots];

    // Count row: how many on break each slot
    const countRow = ['Кол-во операторов','','', ...slots.map(() => 0)];

    // Employee rows
    const empRows = employees.map(emp => {
      const row = [emp.name, emp.shift, emp.sv, ...slots.map(() => '')];
      (emp.breaks||[]).forEach(brk => {
        const startMin = timeToMin(brk.start);
        const endMin   = timeToMin(brk.end);
        for (let m = startMin; m < endMin; m += 10) {
          const tStr = minToTime(m);
          const idx  = slots.indexOf(tStr);
          if (idx >= 0) {
            row[3 + idx] = brk.type;
            countRow[3 + idx]++;
          }
        }
      });
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([hdr, countRow, ...empRows]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `KAORZIP_Перерывы_${dateKey(new Date())}.xlsx`);
  toast('✅ Перерывы выгружены', 'success');
}

// ═══════════════════════════════════════════════
// IMAGE / PDF EXPORT
// ═══════════════════════════════════════════════

async function captureAndSave(elementId, filename, caption='') {
  if (!window.H2C_AVAILABLE) { toast('html2canvas не загружен (нужен интернет)', 'warning'); return; }
  const node = el(elementId);
  if (!node) { toast('Нечего сохранять', 'warning'); return; }
  toast('⏳ Генерация изображения…');
  try {
    // Force load all scroll content
    const oldOverflow = node.style.overflow;
    node.style.overflow = 'visible';
    qsa('.tl-scroll, .brk-scroll-wrap', node).forEach(s => { s.dataset._prevOv = s.style.overflow; s.style.overflow = 'visible'; });

    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: Math.max(node.scrollWidth, 1920),
    });

    // Restore
    node.style.overflow = oldOverflow;
    qsa('.tl-scroll, .brk-scroll-wrap', node).forEach(s => { s.style.overflow = s.dataset._prevOv || ''; });

    const a = document.createElement('a');
    a.download = filename;
    a.href = canvas.toDataURL('image/png');
    a.click();
    toast('✅ Изображение сохранено', 'success');
  } catch(e) { toast('❌ Ошибка: ' + e.message, 'error'); }
}

async function captureAndPDF(elementId, filename) {
  if (!window.H2C_AVAILABLE || !window.JSPDF_AVAILABLE) { toast('Нужен интернет для библиотек PDF', 'warning'); return; }
  const node = el(elementId);
  if (!node) return;
  toast('⏳ Генерация PDF…');
  try {
    const oldOverflow = node.style.overflow;
    node.style.overflow = 'visible';
    qsa('.tl-scroll, .brk-scroll-wrap', node).forEach(s => { s.dataset._prevOv = s.style.overflow; s.style.overflow = 'visible'; });

    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', windowWidth: Math.max(node.scrollWidth, 1920), logging:false });

    node.style.overflow = oldOverflow;
    qsa('.tl-scroll, .brk-scroll-wrap', node).forEach(s => { s.style.overflow = s.dataset._prevOv || ''; });

    const { jsPDF } = window.jspdf;
    // Multi-page A4 landscape PDF
    const pdf = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
    const pageW = 297;  // A4 landscape width in mm
    const pageH = 210;
    const margin = 5;
    const usableW = pageW - 2*margin;
    const usableH = pageH - 2*margin - 8; // 8mm for header

    // Scale image to fit page width
    const imgW = usableW;
    const imgH = canvas.height * imgW / canvas.width;

    let yOffset = 0;
    let pageNum = 1;
    const totalPages = Math.ceil(imgH / usableH);

    while (yOffset < imgH) {
      if (pageNum > 1) pdf.addPage();
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text(`KAORZIP · ${formatDisp(S.date)} · стр. ${pageNum}/${totalPages}`, margin, margin+4);

      // Calculate slice from source canvas
      const sliceCanvas = document.createElement('canvas');
      const srcH = Math.min((usableH/imgH) * canvas.height, canvas.height - (yOffset/imgH)*canvas.height);
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0,0,canvas.width,srcH);
      ctx.drawImage(canvas, 0, (yOffset/imgH)*canvas.height, canvas.width, srcH, 0, 0, canvas.width, srcH);

      const sliceImgH = srcH * imgW / canvas.width;
      pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.88), 'JPEG', margin, margin+8, imgW, sliceImgH);

      yOffset += usableH;
      pageNum++;
    }

    pdf.save(filename);
    toast('✅ PDF сохранён', 'success');
  } catch(e) { toast('❌ Ошибка PDF: ' + e.message, 'error'); }
}

function exportJSON() {
  const payload = { schedule: S.data, breaks: S.breaks, exported: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.download = `KAORZIP_backup_${dateKey(new Date())}.json`;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✅ JSON резервная копия сохранена', 'success');
}

function exportTextReport() {
  const dk = dateKey(S.date);
  const lines = [`📅 График на ${formatDisp(S.date)}`, ''];
  const rgs = [...new Set(S.data.map(e=>e.rg))].filter(Boolean).sort();
  (rgs.length ? rgs : ['']).forEach(rg => {
    const group = rg ? S.data.filter(e=>e.rg===rg) : S.data;
    if (rg) lines.push(`📂 ${rg}:`);
    group.forEach(e => {
      const sc = e.schedule[dk] || { status:'off' };
      const t = sc.shiftStart ? ` (${sc.shiftStart}–${sc.shiftEnd})` : '';
      lines.push(`  • ${e.name} — ${STATUS_LABEL[sc.status]||'—'}${t}`);
    });
    lines.push('');
  });
  const text = lines.join('\n');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast('✅ Скопировано в буфер', 'success'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    toast('✅ Скопировано', 'success');
  }
}

// ═══════════════════ NAVIGATION ══════════════════

const PAGE_LABELS = {
  dashboard:'Dashboard', timeline:'Timeline смен', breaks:'Перерывы',
  calendar:'Календарь', employees:'Сотрудники', favorites:'Избранные',
  import:'Импорт данных', export:'Экспорт', employee:'Профиль',
};

function navigate(page, params={}) {
  qsa('.page').forEach(p => p.classList.add('hidden'));
  const target = el(`page-${page}`);
  if (!target) return;
  target.classList.remove('hidden');
  qsa('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page===page));
  S.page = page;
  el('breadcrumb').textContent = PAGE_LABELS[page]||page;

  // Cache employee id for profile page so hashchange doesn't lose it
  if (page === 'employee' && params.id) S.currentEmpId = params.id;

  const renders = { dashboard:renderDashboard, timeline:renderTimeline, breaks:renderBreaksPage,
    calendar:renderCalendar, employees:renderEmployees, favorites:renderFavorites,
    import:renderImport, export:renderExport };
  if (renders[page]) renders[page]();
  else if (page==='employee') renderProfile(params.id || S.currentEmpId);

  _internalNav = true;
  window.location.hash = page;
  setTimeout(() => { _internalNav = false; }, 80);
}

function handleHash() {
  if (_internalNav) return;
  const uParam = new URLSearchParams(window.location.search).get('user');
  if (uParam && S.data.length) {
    const emp = S.data.find(e => e.name.toLowerCase().includes(uParam.toLowerCase()));
    if (emp) { navigate('employee', { id: emp.name }); return; }
  }
  const h = window.location.hash.slice(1);
  if (h === 'employee' && S.currentEmpId) { navigate('employee', { id: S.currentEmpId }); return; }
  navigate(PAGE_LABELS[h] ? h : 'dashboard');
}

// ═══════════════════ HELPERS ═════════════════════

function getScheduleOn(emp, d=S.date) {
  return (emp.schedule||{})[dateKey(d)] || { status:'off' };
}

function getBreaksFor(empName) {
  // Fuzzy match: names may be truncated in file 1
  const norm = n => (n||'').toLowerCase().replace(/\s+/g,' ').trim();
  const en = norm(empName);
  return S.breaks.find(b => {
    const bn = norm(b.name);
    return bn === en || en.startsWith(bn.substring(0,12)) || bn.startsWith(en.substring(0,12));
  });
}

function getUniqueVals(arr, key) {
  return [...new Set(arr.map(e=>e[key]).filter(Boolean))].sort();
}

function populateSelect(id, vals) {
  const s = el(id); if (!s) return;
  const first = s.options[0] ? s.options[0].outerHTML : '';
  s.innerHTML = first + vals.map(v=>`<option value="${v}">${v}</option>`).join('');
}

function filterEmps(opts={}) {
  let data = [...S.data];
  if (opts.rg)     data = data.filter(e=>e.rg===opts.rg);
  if (opts.sv)     data = data.filter(e=>e.sv===opts.sv);
  if (opts.shift)  data = data.filter(e=>e.graphSurv===opts.shift||e.shiftCode===opts.shift);
  if (opts.status) { const dk=dateKey(S.date); data=data.filter(e=>(e.schedule[dk]||{}).status===opts.status); }
  if (opts.search) { const q=opts.search.toLowerCase(); data=data.filter(e=>e.name.toLowerCase().includes(q)||e.sv.toLowerCase().includes(q)||(e.rg||'').toLowerCase().includes(q)); }
  return data;
}

// ═══════════════════ TIMELINE ════════════════════

function tStrToX(tStr) {
  const m = timeToMin(tStr);
  if (m < TL_START) return tStrToX(minToTime(TL_START));
  return (m - TL_START) * TL_PX_MIN;
}

function tDurPx(start, end) {
  const s = timeToMin(start);
  let e   = timeToMin(end);
  if (e < s) e += 24*60; // overnight
  return Math.max((e - s) * TL_PX_MIN, 4);
}

function nowX() {
  const n = new Date();
  const m = n.getHours()*60 + n.getMinutes();
  if (m < TL_START || m > TL_END) return -1;
  return (m - TL_START) * TL_PX_MIN;
}

// ═══════════════════ DASHBOARD ═══════════════════

function renderDashboard() {
  el('dashSubtitle').textContent = formatDisp(S.date);

  if (!S.data.length) {
    setHTML('dashContent', emptyState('Данные не загружены', 'Импортируйте файл расписания через раздел «Импорт Excel»', '📥'));
    return;
  }

  const dk = dateKey(S.date);
  const rgs = getUniqueVals(S.data,'rg');
  populateSelect('dashDeptFilter', rgs);
  const rgF = (el('dashDeptFilter')||{}).value||'';
  let display = rgF ? S.data.filter(e=>e.rg===rgF) : S.data;

  const counts = { work:0, night:0, changed:0, vac:0, sick:0, study:0, unpaid:0, absence:0, off:0 };
  display.forEach(e => {
    const st = (e.schedule[dk]||{}).status||'off';
    if (st==='work') counts.work++;
    else if (st==='21') counts.night++;
    else if (st==='9')  counts.changed++;
    else if (st==='ОТ') counts.vac++;
    else if (st==='БЛ') counts.sick++;
    else if (st==='УО') counts.study++;
    else if (st==='ОЗ') counts.unpaid++;
    else if (st==='НЯ') counts.absence++;
    else counts.off++;
  });
  const active = counts.work + counts.night + counts.changed;
  const onBreak = getCurrentlyOnBreak();
  const isLive  = isToday(S.date);

  const cards = [
    { icon:'👥', label:'Всего в системе', v: display.length, color:'#3b82f6', meta:'' },
    { icon:'✅', label:'Работают',         v: active,         color:'#10b981', meta:`из ${display.length}` },
    ...(isLive ? [{ icon:'☕', label:'Сейчас на перерыве', v: onBreak.length, color:'#f59e0b', meta:'в реальном времени' }] : []),
    { icon:'🌙', label:'Ночная смена',     v: counts.night,   color:'#8b5cf6', meta:'' },
    { icon:'🔄', label:'Изм. смены',       v: counts.changed, color:'#10b981', meta:'' },
    { icon:'🏖️', label:'Отпуск',           v: counts.vac,     color:'#64748b', meta:'' },
    { icon:'🤒', label:'Больничный',       v: counts.sick,    color:'#ef4444', meta:'' },
    { icon:'⚠️', label:'Неявка',           v: counts.absence, color:'#dc2626', meta:'' },
  ];

  const statsHTML = `<div class="stats-grid">${
    cards.map(c=>`<div class="stat-card">
      <div class="stat-card-icon" style="background:${c.color}18;">${c.icon}</div>
      <div class="stat-card-label">${c.label}</div>
      <div class="stat-card-value" style="color:${c.color};">${c.v}</div>
      ${c.meta?`<div class="stat-card-meta">${c.meta}</div>`:''}
    </div>`).join('')
  }</div>`;

  // Currently on break — live widget
  const onBreakHTML = isLive ? `
    <div class="card">
      <div class="card-hdr">
        <span class="card-title">☕ Сейчас на перерыве (${onBreak.length})</span>
        <span class="txt-muted txt-sm">обновляется автоматически</span>
      </div>
      <div class="card-body">
        ${onBreak.length ? `<div class="onbreak-list">${onBreak.map(b => {
          const emp = S.data.find(e => e.name.startsWith(b.name.substring(0,12)) || b.name.startsWith(e.name.substring(0,12)));
          const col = emp?.color||'#f59e0b';
          const typeCol = BREAK_COLORS[b.type]||'#f59e0b';
          return `<div class="onbreak-row" onclick="navigate('employee',{id:'${(emp?.name||b.name).replace(/'/g,"\\'")}'})">
            ${avatarHTML(b.name, col, 32)}
            <div class="onbreak-info">
              <div class="onbreak-name">${b.name.split(' ').slice(0,2).join(' ')}</div>
              <div class="onbreak-meta">СВ: ${(b.sv||'').split(' ')[0]} · ${b.start}–${b.end}</div>
            </div>
            <span class="badge" style="background:${typeCol}22;color:${typeCol};">${b.type}</span>
            <span class="onbreak-left">осталось ${b.remaining} мин</span>
          </div>`;
        }).join('')}</div>` : '<div class="txt-muted" style="padding:12px 0;">Никто не на перерыве</div>'}
      </div>
    </div>
  ` : '';

  // Working / not working lists
  const working    = display.filter(e => { const st=(e.schedule[dk]||{}).status; return st==='work'||st==='21'||st==='9'; });
  const notWorking = display.filter(e => { const st=(e.schedule[dk]||{}).status; return st&&st!=='work'&&st!=='21'&&st!=='9'&&st!=='off'; });

  function empRow(e) {
    const sc = e.schedule[dk]||{status:'off'};
    const t  = sc.shiftStart ? `<span class="txt-sm txt-muted" style="margin-left:auto;margin-right:8px;">${sc.shiftStart}–${sc.shiftEnd}</span>` : '';
    const safeName = e.name.replace(/'/g,"\\'");
    return `<div class="emp-row" onclick="navigate('employee',{id:'${safeName}'})">
      ${avatarHTML(e.name, e.color||'#3b82f6', 34)}
      <div class="emp-info">
        <div class="emp-name">${e.name}</div>
        <div class="emp-meta">СВ: <b>${e.sv||'—'}</b> · ${e.rg||''}</div>
      </div>
      ${t}
      ${badge(sc.status)}
    </div>`;
  }

  // RG analytics — full names, no truncation, sortable
  const rgStats = rgs.map(rg => {
    const g = S.data.filter(e=>e.rg===rg);
    const w = g.filter(e=>{ const st=(e.schedule[dk]||{}).status; return st==='work'||st==='21'||st==='9'; }).length;
    return { rg, total:g.length, working:w };
  }).sort((a,b)=>b.total-a.total);

  setHTML('dashContent', `
    ${statsHTML}
    ${onBreakHTML}
    <div class="dash-grid">
      <div class="dash-col">
        <div class="card">
          <div class="card-hdr"><span class="card-title">✅ Работают (${working.length})</span></div>
          <div class="card-body">
            ${working.length ? working.slice(0,12).map(empRow).join('') : '<div class="txt-muted" style="padding:12px 0;">Никто не работает</div>'}
            ${working.length>12?`<div class="txt-muted txt-sm" style="padding:8px 0;text-align:center;"><a href="#timeline" onclick="navigate('timeline');return false;" style="color:var(--primary);">Смотреть всех в Timeline →</a></div>`:''}
          </div>
        </div>
      </div>
      <div class="dash-col">
        ${notWorking.length ? `<div class="card">
          <div class="card-hdr"><span class="card-title">⏸ Не работают (${notWorking.length})</span></div>
          <div class="card-body">${notWorking.slice(0,8).map(empRow).join('')}</div>
        </div>` : ''}
        <div class="card">
          <div class="card-hdr"><span class="card-title">📊 По группам (РГ)</span></div>
          <div class="card-body">
            <div class="mini-bars">${rgStats.map(({rg,total,working:w})=>{
              const pct = total ? Math.round(w/total*100) : 0;
              return `<div class="mini-bar-row">
                <span class="mini-bar-label-full" title="${rg}">${rg}</span>
                <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${pct}%;"></div></div>
                <span class="mini-bar-num">${w}/${total}</span>
              </div>`;
            }).join('')}</div>
          </div>
        </div>
      </div>
    </div>
  `);
}

// ═══════════════════ TIMELINE ════════════════════

function renderTimeline() {
  el('timelineSubtitle').textContent = formatDisp(S.date);

  if (!S.data.length) {
    setHTML('timelineContent', emptyState('Данные не загружены', 'Импортируйте файл расписания', '📥'));
    return;
  }

  const rgs   = getUniqueVals(S.data,'rg');
  const svs   = getUniqueVals(S.data,'sv');
  populateSelect('tlRGFilter', rgs);
  populateSelect('tlSVFilter', svs);

  const rgF    = (el('tlRGFilter')||{}).value||'';
  const svF    = (el('tlSVFilter')||{}).value||'';
  const shiftF = (el('tlShiftFilter')||{}).value||'';

  let filtered = filterEmps({ rg:rgF, sv:svF, shift:shiftF });
  filtered = filtered.filter(e => (e.schedule[dateKey(S.date)]||{}).status !== 'off');

  const hours = [];
  for (let h=8; h<=22; h++) hours.push(h);
  const isToday_ = sameDay(S.date, new Date());
  const nx = nowX();

  const axisHTML = hours.map(h=>`<div class="tl-hour${isToday_&&h===new Date().getHours()?' tl-hour-now':''}">${pad(h)}:00</div>`).join('');

  const gridLines = hours.map(()=>`<div class="tl-grid-line"></div>`).join('');

  function buildBlock(sc, brk) {
    let html = '';
    if (!sc) return html;

    const isWork   = sc.status==='work'||sc.status==='9';
    const isNight  = sc.status==='21';
    const isLeave  = ['ОТ','БЛ','УО','ОЗ','НЯ'].includes(sc.status);

    if (isWork || isNight) {
      const x = tStrToX(sc.shiftStart||'09:00');
      const w = tDurPx(sc.shiftStart||'09:00', sc.shiftEnd||'18:00');
      const cls = isNight ? 'tl-b-night' : (sc.status==='9'?'tl-b-changed':'tl-b-work');
      const label = w > 80 ? `${sc.shiftStart}–${sc.shiftEnd}` : '';
      html += `<div class="tl-block ${cls}" style="left:${x}px;width:${w}px;" data-tip="${STATUS_LABEL[sc.status]}|${sc.shiftStart}–${sc.shiftEnd}">${label}</div>`;

      // Breaks from file 2 if available, else lunch from schedule
      if (brk && brk.breaks && brk.breaks.length) {
        brk.breaks.forEach(b => {
          const bx = tStrToX(b.start);
          const bw = tDurPx(b.start, b.end);
          if (bx < 0) return;
          const col = BREAK_COLORS[b.type]||'#f59e0b';
          const bLabel = bw > 50 ? b.start : '';
          html += `<div class="tl-block tl-b-break" style="left:${bx}px;width:${Math.max(bw,6)}px;background:${col};" data-tip="${b.type}|${b.start}–${b.end}">${bLabel}</div>`;
        });
      } else if (sc.lunchHour) {
        const lx = tStrToX(`${pad(sc.lunchHour)}:00`);
        html += `<div class="tl-block tl-b-break" style="left:${lx}px;width:${60*TL_PX_MIN}px;background:#f97316;" data-tip="Обед|${pad(sc.lunchHour)}:00–${pad(sc.lunchHour+1)}:00">${pad(sc.lunchHour)}:00</div>`;
      }
    } else if (isLeave) {
      const TL_W = (TL_END-TL_START)*TL_PX_MIN;
      const colMap = {ОТ:'#64748b',БЛ:'#ef4444',УО:'#06b6d4',ОЗ:'#f97316',НЯ:'#dc2626'};
      const col = colMap[sc.status]||'#94a3b8';
      html += `<div class="tl-block" style="left:0;width:${TL_W}px;background:${col}18;color:${col};border:1px dashed ${col};" data-tip="${STATUS_LABEL[sc.status]}|весь день">${STATUS_LABEL[sc.status]}</div>`;
    }
    return html;
  }

  // Group by RG
  const groupMap = {};
  filtered.forEach(e => {
    const g = e.rg || 'Без группы';
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(e);
  });

  const TL_W = (TL_END - TL_START) * TL_PX_MIN;

  const rowsHTML = Object.entries(groupMap).map(([grp, emps]) => `
    <div class="tl-group">
      <div class="tl-group-hdr" onclick="this.parentElement.classList.toggle('tl-collapsed')">
        <span class="tl-collapse-ico">▼</span>
        <span>${grp}</span>
        <span class="tl-group-count">${emps.length} чел.</span>
      </div>
      <div class="tl-group-rows">
        ${emps.map(e => {
          const sc  = getScheduleOn(e);
          const brk = getBreaksFor(e.name);
          const ini = e.name.split(' ').slice(0,2).map(w=>w[0]).join('');
          const safeName = e.name.replace(/'/g,"\\'");
          return `<div class="tl-row">
            <div class="tl-emp-cell" onclick="navigate('employee',{id:'${safeName}'})">
              <div class="tl-emp-ava" style="background:${e.color}22;color:${e.color};">${ini}</div>
              <div>
                <div class="tl-emp-name">${e.name.split(' ').slice(0,2).join(' ')}</div>
                <div class="tl-emp-meta">СВ: ${(e.sv||'').split(' ')[0]} · ${e.graphSurv||''}</div>
              </div>
            </div>
            <div class="tl-blocks-wrap" style="width:${TL_W}px;">
              <div class="tl-grid-lines">${gridLines}</div>
              ${buildBlock(sc, brk)}
              ${isToday_&&nx>=0?`<div class="tl-now-line" style="left:${nx}px;"></div>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  const nowLineHeader = isToday_&&nx>=0 ? `<div class="tl-now-line tl-now-header" style="left:${nx+200}px;"><div class="tl-now-dot"></div><div class="tl-now-lbl">${minToTime(new Date().getHours()*60+new Date().getMinutes())}</div></div>` : '';

  setHTML('timelineContent', `
    <div class="tl-wrap" id="tlWrap">
      <div class="tl-scroll" id="tlScroll">
        <div style="min-width:${TL_W+200}px;position:relative;">
          <div class="tl-header">
            <div class="tl-name-hdr">Сотрудник</div>
            <div class="tl-axis">${axisHTML}</div>
          </div>
          ${rowsHTML || emptyState('Нет работающих сотрудников за этот день', '', '📅')}
        </div>
      </div>
    </div>
  `);

  initTooltips();

  // Auto-scroll to now
  if (isToday_ && nx > 0) {
    setTimeout(() => {
      const s = el('tlScroll');
      if (s) s.scrollLeft = Math.max(0, nx - 200);
    }, 80);
  }
}

function initTooltips() {
  let tip = el('tlTip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'tlTip';
    tip.className = 'tl-tooltip';
    document.body.appendChild(tip);
  }
  qsa('[data-tip]').forEach(b => {
    b.onmouseenter = function(ev) {
      const [a,c] = this.dataset.tip.split('|');
      tip.innerHTML = `<strong>${a}</strong>${c}`;
      tip.style.display = 'block';
    };
    b.onmouseleave = () => { tip.style.display='none'; };
    b.onmousemove  = ev => {
      tip.style.left = (ev.clientX+12)+'px';
      tip.style.top  = (ev.clientY-40)+'px';
    };
  });
}

// ═══════════════════ BREAKS PAGE ═════════════════

function renderBreaksPage() {
  const dk = dateKey(S.date);
  el('breaksSubtitle') && (el('breaksSubtitle').textContent = formatDisp(S.date));

  if (!S.breaks.length && !S.data.length) {
    setHTML('breaksContent', emptyState('Данные не загружены', 'Импортируйте файл перерывов', '☕'));
    return;
  }

  const rgs = getUniqueVals(S.data,'rg');
  const svs = [...new Set([...getUniqueVals(S.data,'sv'), ...S.breaks.map(b=>b.sv).filter(Boolean)])].sort();
  populateSelect('brkRGFilter', rgs);
  populateSelect('brkSVFilter', svs);

  const rgF = (el('brkRGFilter')||{}).value||'';
  const svF = (el('brkSVFilter')||{}).value||'';

  // Build display list
  const display = [];
  if (S.breaks.length) {
    let brkList = [...S.breaks];
    if (svF) brkList = brkList.filter(b => b.sv === svF);
    if (rgF) {
      const rgEmps = S.data.filter(e=>e.rg===rgF).map(e=>e.name);
      brkList = brkList.filter(b => rgEmps.some(n => n.startsWith(b.name.substring(0,12)) || b.name.startsWith(n.substring(0,12))));
    }
    brkList.forEach(b => display.push(b));
  } else {
    let emps = filterEmps({ rg:rgF, sv:svF });
    emps = emps.filter(e => { const sc = getScheduleOn(e); return (sc.status==='work'||sc.status==='9') && sc.lunchHour; });
    emps.forEach(e => {
      const sc = getScheduleOn(e);
      display.push({ name:e.name, shift:`${sc.shiftStart}–${sc.shiftEnd}`, sv:e.sv,
        breaks: sc.lunchHour ? [{start:`${pad(sc.lunchHour)}:00`,end:`${pad(sc.lunchHour+1)}:00`,type:'обед'}] : [] });
    });
  }

  // ── LIVE: who is on break now
  const onBreak = getCurrentlyOnBreak();
  const returningSoon = getReturningSoon();
  const isLive = isToday(S.date);

  const onBreakWidget = isLive ? `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-hdr">
        <span class="card-title">☕ Сейчас на перерыве: <b style="color:var(--primary);">${onBreak.length}</b></span>
        <span class="txt-muted txt-sm">Время: ${pad(new Date().getHours())}:${pad(new Date().getMinutes())} · обновляется</span>
      </div>
      <div class="card-body">
        ${onBreak.length ? `
          <div class="onbreak-list">${onBreak.map(b => {
            const emp = S.data.find(e => e.name.startsWith(b.name.substring(0,12)) || b.name.startsWith(e.name.substring(0,12)));
            const col = emp?.color||'#f59e0b';
            const typeCol = BREAK_COLORS[b.type]||'#f59e0b';
            const safe = (emp?.name||b.name).replace(/'/g,"\\'");
            return `<div class="onbreak-row" onclick="navigate('employee',{id:'${safe}'})">
              ${avatarHTML(b.name, col, 32)}
              <div class="onbreak-info">
                <div class="onbreak-name">${b.name.split(' ').slice(0,2).join(' ')}</div>
                <div class="onbreak-meta">СВ: ${(b.sv||'').split(' ')[0]} · ${b.start}–${b.end}</div>
              </div>
              <span class="badge" style="background:${typeCol}22;color:${typeCol};">${b.type}</span>
              <span class="onbreak-left">${b.remaining} мин</span>
            </div>`;
          }).join('')}</div>
        ` : '<div class="txt-muted" style="padding:10px 0;">Сейчас никого нет на перерыве</div>'}
        ${returningSoon.length ? `
          <div class="divider"></div>
          <div class="txt-sm txt-muted" style="margin-bottom:6px;font-weight:600;">⏱ Скоро уйдут на перерыв (≤10 мин):</div>
          <div class="returning-list">${returningSoon.map(b => `<span class="returning-chip">${b.name.split(' ').slice(0,2).join(' ')} <small>(${b.type} в ${b.start})</small></span>`).join('')}</div>
        ` : ''}
      </div>
    </div>
  ` : '';

  const TL_W  = (TL_END - TL_START) * TL_PX_MIN;
  const hours = [];
  for (let h=8;h<=22;h++) hours.push(h);
  const axisHTML = hours.map(h=>`<span class="brk-time-tick" style="left:${(h*60-TL_START)*TL_PX_MIN}px;">${pad(h)}:00</span>`).join('');
  const nx = nowX();

  const rowsHTML = display.map(b => {
    const emp = S.data.find(e=>e.name.startsWith(b.name.substring(0,12))||b.name.startsWith(e.name.substring(0,12)));
    const col  = emp ? emp.color : '#3b82f6';

    let shiftBarHTML = '';
    if (b.shift && b.shift.includes('–')) {
      const [sh,se] = b.shift.split('–');
      const sx = tStrToX(sh.trim()||'08:00');
      const sw = tDurPx(sh.trim()||'08:00', se.trim()||'20:00');
      shiftBarHTML = `<div style="position:absolute;top:50%;transform:translateY(-50%);height:6px;border-radius:3px;background:${col}25;left:${sx}px;width:${sw}px;"></div>`;
    }

    const breakSegs = (b.breaks||[]).map(br => {
      const bx = tStrToX(br.start);
      const bw = tDurPx(br.start, br.end);
      const bc = BREAK_COLORS[br.type]||'#f59e0b';
      const safe = b.name.replace(/'/g,"\\'");
      return `<div class="brk-seg" style="left:${bx}px;width:${Math.max(bw,8)}px;background:${bc};" title="${br.type}: ${br.start}–${br.end} · кликни для редактирования" onclick="showBreakEdit('${safe}','${br.start}','${br.end}','${br.type}')"><span class="brk-seg-lbl">${bw>40?br.start:''}</span></div>`;
    }).join('');

    const safeNav = (emp?.name||b.name).replace(/'/g,"\\'");

    return `<div class="brk-row">
      <div class="brk-emp-info" onclick="navigate('employee',{id:'${safeNav}'})" style="cursor:pointer;">
        <div class="brk-emp-name">${b.name.split(' ').slice(0,2).join(' ')}</div>
        <div class="brk-emp-sv">СВ: ${(b.sv||'').split(' ')[0]}</div>
        <div class="brk-emp-shift txt-sm txt-muted">${b.shift||''}</div>
      </div>
      <div class="brk-track" style="width:${TL_W}px;">
        ${shiftBarHTML}
        ${breakSegs}
        ${isLive&&nx>=0?`<div class="tl-now-line" style="left:${nx}px;height:100%;"></div>`:''}
      </div>
    </div>`;
  }).join('');

  setHTML('breaksContent', `
    ${onBreakWidget}
    <div class="card" id="breaksCard">
      <div class="card-hdr">
        <span class="card-title">📋 Расписание перерывов — ${display.length} сотрудников</span>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          ${Object.entries(BREAK_COLORS).map(([t,c])=>`<span style="display:flex;align-items:center;gap:5px;font-size:.78rem;"><span style="width:12px;height:12px;border-radius:3px;background:${c};"></span>${t}</span>`).join('')}
        </div>
      </div>
      <div class="card-body brk-scroll-wrap">
        <div style="min-width:${TL_W+220}px;">
          <div style="display:flex;margin-bottom:6px;">
            <div style="width:220px;min-width:220px;"></div>
            <div style="position:relative;height:20px;flex:1;">${axisHTML}</div>
          </div>
          ${rowsHTML || emptyState('Нет данных перерывов', 'Импортируйте файл перерывов', '☕')}
        </div>
      </div>
    </div>
  `);
}

function showBreakEdit(empName, start, end, type) {
  // Edit break modal
  const emp = S.breaks.find(b => b.name.startsWith(empName.substring(0,12)) || empName.startsWith(b.name.substring(0,12)));
  if (!emp) { toast('Сотрудник не найден', 'warning'); return; }

  const breakIdx = emp.breaks.findIndex(b=>b.start===start&&b.type===type);

  openModal(`Перерыв: ${empName.split(' ').slice(0,2).join(' ')}`, `
    <div class="modal-section">
      <div class="modal-section-title">Изменить перерыв</div>
      <div class="form-row">
        <label>Тип</label>
        <select id="editBrkType">
          ${['перерыв','обед','ужин'].map(t=>`<option ${t===type?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label>Начало</label>
        <input type="time" id="editBrkStart" value="${start}" />
      </div>
      <div class="form-row">
        <label>Конец</label>
        <input type="time" id="editBrkEnd" value="${end}" />
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn btn-primary" onclick="saveBreakEdit('${empName}',${breakIdx})">Сохранить</button>
      <button class="btn btn-ghost" onclick="closeModal()">Отмена</button>
      <button class="btn btn-danger" style="margin-left:auto;" onclick="deleteBreak('${empName}',${breakIdx})">Удалить</button>
    </div>
  `);
}

window.saveBreakEdit = function(empName, idx) {
  const emp = S.breaks.find(b => b.name.startsWith(empName.substring(0,12)) || empName.startsWith(b.name.substring(0,12)));
  if (!emp || idx < 0) return;
  emp.breaks[idx] = {
    ...emp.breaks[idx],
    type:  el('editBrkType').value,
    start: el('editBrkStart').value,
    end:   el('editBrkEnd').value,
  };
  saveBreaks();
  closeModal();
  renderBreaksPage();
  toast('✅ Перерыв сохранён', 'success');
};

window.deleteBreak = function(empName, idx) {
  const emp = S.breaks.find(b => b.name.startsWith(empName.substring(0,12)) || empName.startsWith(b.name.substring(0,12)));
  if (!emp || idx < 0) return;
  emp.breaks.splice(idx, 1);
  saveBreaks();
  closeModal();
  renderBreaksPage();
  toast('✅ Перерыв удалён', 'success');
};

// ═══════════════════ CALENDAR ════════════════════

function renderCalendar() {
  if (S.calYear===null) { S.calYear=S.date.getFullYear(); S.calMonth=S.date.getMonth(); }

  const rgs = getUniqueVals(S.data,'rg');
  const emps = S.data.map(e=>e.name).sort();
  populateSelect('calRGFilter', rgs);
  populateSelect('calEmpFilter', emps);

  const selEmp = (el('calEmpFilter')||{}).value||'';
  const selRG  = (el('calRGFilter')||{}).value||'';
  let dispEmps = selEmp ? S.data.filter(e=>e.name===selEmp)
               : selRG  ? S.data.filter(e=>e.rg===selRG)
               : S.data;

  const y=S.calYear, m=S.calMonth;
  const dim = new Date(y,m+1,0).getDate();
  const firstDow = (new Date(y,m,1).getDay()+6)%7; // Mon=0
  const prevDim  = new Date(y,m,0).getDate();

  const dayHeaders = DAYS_RU.slice(1).concat(DAYS_RU[0]).map(d=>`<div class="cal-day-hdr">${d}</div>`).join('');

  const cells = [];
  for(let i=0;i<firstDow;i++) cells.push({d:prevDim-firstDow+i+1,m:m-1,y,other:true});
  for(let d=1;d<=dim;d++) cells.push({d,m,y,other:false});
  while((cells.length%7)!==0) { const d=cells.length-firstDow-dim+1; cells.push({d,m:m+1,y,other:true}); }

  const cellsHTML = cells.map(c=>{
    const date = new Date(c.y,c.m,c.d);
    const dk   = dateKey(date);
    const isT  = isToday(date);
    const isSel= sameDay(date,S.date);

    const evs = dispEmps.slice(0,3).map(e=>{
      const sc=e.schedule[dk];
      if(!sc||sc.status==='off') return null;
      const col=STATUS_COLOR[sc.status]||'#94a3b8';
      return `<div class="cal-ev" style="background:${col}20;color:${col};">${STATUS_LABEL[sc.status]||sc.status}</div>`;
    }).filter(Boolean);

    return `<div class="cal-day${c.other?' cal-day-other':''}${isT?' cal-day-today':''}${isSel&&!isT?' cal-day-sel':''}" onclick="calClick(${c.y},${c.m},${c.d})">
      <div class="cal-day-num">${c.d}</div>
      <div class="cal-day-evs">${evs.join('')}</div>
    </div>`;
  }).join('');

  // Month summary for selected employee
  let summaryHTML = '';
  if (selEmp) {
    const emp = S.data.find(e=>e.name===selEmp);
    if (emp) {
      const cnt={work:0,night:0,vac:0,sick:0,off:0};
      for(let d=1;d<=dim;d++){
        const dk=`${y}-${pad(m+1)}-${pad(d)}`;
        const sc=emp.schedule[dk]||{status:'off'};
        if(sc.status==='work'||sc.status==='9') cnt.work++;
        else if(sc.status==='21') cnt.night++;
        else if(sc.status==='ОТ') cnt.vac++;
        else if(sc.status==='БЛ') cnt.sick++;
        else cnt.off++;
      }
      summaryHTML=`<div class="card" style="margin-top:16px;">
        <div class="card-hdr"><span class="card-title">Итоги ${MONTHS_NOM[m]} — ${emp.name}</span></div>
        <div class="card-body"><div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr));">
          <div class="stat-card"><div class="stat-card-label">Рабочих</div><div class="stat-card-value" style="color:var(--c-work);">${cnt.work}</div></div>
          <div class="stat-card"><div class="stat-card-label">Ночных</div><div class="stat-card-value" style="color:var(--c-night);">${cnt.night}</div></div>
          <div class="stat-card"><div class="stat-card-label">Отпуск</div><div class="stat-card-value" style="color:var(--c-vac);">${cnt.vac}</div></div>
          <div class="stat-card"><div class="stat-card-label">Больничный</div><div class="stat-card-value" style="color:var(--c-sick);">${cnt.sick}</div></div>
        </div></div>
      </div>`;
    }
  }

  setHTML('calendarContent', `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <button class="btn btn-ghost" onclick="calNav(-1)">‹ Пред.</button>
      <h2 style="font-size:1.1rem;font-weight:700;min-width:160px;text-align:center;">${MONTHS_NOM[m]} ${y}</h2>
      <button class="btn btn-ghost" onclick="calNav(1)">След. ›</button>
    </div>
    <div class="card"><div class="card-body">
      <div class="cal-grid">${dayHeaders}${cellsHTML}</div>
    </div></div>
    ${summaryHTML}
  `);
}

function calNav(dir) {
  S.calMonth += dir;
  if (S.calMonth<0) { S.calMonth=11; S.calYear--; }
  if (S.calMonth>11){ S.calMonth=0;  S.calYear++; }
  renderCalendar();
}
window.calClick = function(y,m,d) {
  S.date = new Date(y,m,d);
  updateDateDisplay();
  navigate('timeline');
};

// ═══════════════════ EMPLOYEES ═══════════════════

function renderEmployees() {
  const rgs = getUniqueVals(S.data,'rg');
  const svs = getUniqueVals(S.data,'sv');
  populateSelect('empRGFilter', rgs);
  populateSelect('empSVFilter', svs);
  applyEmpFilters();
}

function applyEmpFilters() {
  const rg     = (el('empRGFilter')||{}).value||'';
  const sv     = (el('empSVFilter')||{}).value||'';
  const shift  = (el('empShiftFilter')||{}).value||'';
  const status = (el('empStatusFilter')||{}).value||'';
  const search = (el('empSearch')||{}).value||'';
  let data = filterEmps({ rg, sv, shift, status, search });
  data.sort((a,b)=>{
    let va=a[S.sortCol]||'', vb=b[S.sortCol]||'';
    if(S.sortCol==='status'){va=(a.schedule[dateKey(S.date)]||{}).status||'';vb=(b.schedule[dateKey(S.date)]||{}).status||'';}
    return (S.sortDir==='asc'?1:-1)*va.localeCompare(vb,'ru');
  });
  el('empSubtitle') && (el('empSubtitle').textContent = `${data.length} сотрудников`);
  const dk=dateKey(S.date);
  function th(col,lbl){const a=S.sortCol===col;return `<th class="${a?'sort-'+S.sortDir:''}" onclick="sortEmps('${col}')">${lbl}</th>`;}
  setHTML('empContent',`
    <div style="overflow-x:auto;border-radius:var(--radius);box-shadow:var(--shadow-sm);">
      <table class="emp-table">
        <thead><tr>${th('name','ФИО')}${th('rg','РГ')}${th('sv','Супервайзер')}${th('graphSurv','График')}${th('status','Статус')}
          <th>Время</th><th>★</th></tr></thead>
        <tbody>${data.map(e=>{
          const sc=e.schedule[dk]||{status:'off'};
          const fav=S.favorites.includes(e.name);
          const safe = e.name.replace(/'/g,"\\'");
          return `<tr onclick="navigate('employee',{id:'${safe}'})">
            <td><div style="display:flex;align-items:center;gap:8px;">${avatarHTML(e.name,e.color,28)}<span style="font-weight:600;">${e.name}</span></div></td>
            <td>${e.rg||'—'}</td><td><b>${e.sv||'—'}</b></td><td><span class="chip">${e.graphSurv||'—'}</span></td>
            <td>${badge(sc.status)}</td>
            <td>${sc.shiftStart?`${sc.shiftStart}–${sc.shiftEnd}`:'—'}</td>
            <td><span class="fav-star" style="color:${fav?'#f59e0b':'var(--border-color)'};" onclick="event.stopPropagation();toggleFav('${safe}')">★</span></td>
          </tr>`;
        }).join('')||`<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--txt-muted);">Ничего не найдено</td></tr>`}</tbody>
      </table>
    </div>
  `);
}

window.sortEmps = function(col) {
  S.sortDir = S.sortCol===col && S.sortDir==='asc' ? 'desc' : 'asc';
  S.sortCol = col;
  applyEmpFilters();
};

window.toggleFav = function(name) {
  S.favorites = S.favorites.includes(name) ? S.favorites.filter(f=>f!==name) : [...S.favorites, name];
  savePrefs();
  if (S.page==='employees') applyEmpFilters();
  if (S.page==='favorites') renderFavorites();
};

// ═══════════════════ FAVORITES ═══════════════════

function renderFavorites() {
  const favs = S.data.filter(e=>S.favorites.includes(e.name));
  if (!favs.length) {
    setHTML('favContent', emptyState('Нет избранных', 'Добавляйте сотрудников через таблицу — нажмите ★', '★'));
    return;
  }
  const dk=dateKey(S.date);
  setHTML('favContent',`<div class="stats-grid">${favs.map(e=>{
    const sc=e.schedule[dk]||{status:'off'};
    const safe = e.name.replace(/'/g,"\\'");
    return `<div class="card" style="cursor:pointer;" onclick="navigate('employee',{id:'${safe}'})">
      <div class="card-body" style="display:flex;align-items:center;gap:12px;">
        ${avatarHTML(e.name,e.color,44)}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.name}</div>
          <div class="txt-muted txt-sm">СВ: ${e.sv||'—'}</div>
          <div style="margin-top:4px;">${badge(sc.status)}</div>
        </div>
        <span class="fav-star" style="color:#f59e0b;" onclick="event.stopPropagation();toggleFav('${safe}')">★</span>
      </div>
    </div>`;
  }).join('')}</div>`);
}

// ═══════════════════ EMPLOYEE PROFILE ════════════

function renderProfile(empName) {
  const emp = S.data.find(e=>e.name===empName);
  if (!emp) { setHTML('profileContent', emptyState('Сотрудник не найден',empName,'⚠️')); return; }

  const sc   = getScheduleOn(emp);
  const brk  = getBreaksFor(emp.name);
  const isFav= S.favorites.includes(emp.name);

  const isWork = ['work','21','9'].includes(sc.status);

  // Week days
  const dow = S.date.getDay();
  const mondayOff = (dow+6)%7;
  const weekDays = Array.from({length:7},(_,i)=>addDays(S.date,i-mondayOff));

  const weekHTML = weekDays.map(d=>{
    const dsc=emp.schedule[dateKey(d)]||{status:'off'};
    const isT=isToday(d);
    const col=STATUS_COLOR[dsc.status]||'#94a3b8';
    const safe = emp.name.replace(/'/g,"\\'");
    return `<div class="profile-day${isT?' profile-day-today':''}" onclick="S.date=new Date(${d.getTime()});updateDateDisplay();renderProfile('${safe}')">
      <div class="profile-day-name">${DAYS_RU[d.getDay()]}</div>
      <div class="profile-day-num">${d.getDate()}</div>
      <div class="profile-day-status" style="color:${col};">${STATUS_LABEL[dsc.status]||'—'}</div>
      ${dsc.shiftStart?`<div class="txt-sm txt-muted">${dsc.shiftStart}–${dsc.shiftEnd}</div>`:''}
    </div>`;
  }).join('');

  const breaksHTML = isWork ? `
    <div class="card">
      <div class="card-hdr"><span class="card-title">☕ Перерывы</span></div>
      <div class="card-body">
        ${(brk?.breaks || (sc.lunchHour?[{start:`${pad(sc.lunchHour)}:00`,end:`${pad(sc.lunchHour+1)}:00`,type:'обед'}]:[])).map(b=>`
          <div class="info-row">
            <span class="info-label">${b.type==='обед'?'🍽 Обед':b.type==='ужин'?'🌙 Ужин':'☕ Перерыв'}</span>
            <span class="info-val">${b.start} – ${b.end}</span>
          </div>`).join('') || '<div class="txt-muted">Нет данных о перерывах</div>'}
      </div>
    </div>
  ` : '';

  // Month stats
  const mPfx=`${S.date.getFullYear()}-${pad(S.date.getMonth()+1)}`;
  const mSt={work:0,night:0,vac:0,sick:0,off:0};
  Object.entries(emp.schedule||{}).forEach(([k,v])=>{
    if(!k.startsWith(mPfx)) return;
    if(v.status==='work'||v.status==='9') mSt.work++;
    else if(v.status==='21') mSt.night++;
    else if(v.status==='ОТ') mSt.vac++;
    else if(v.status==='БЛ') mSt.sick++;
    else mSt.off++;
  });

  const safeName = emp.name.replace(/'/g,"\\'");
  setHTML('profileContent',`
    <div>
      <button class="btn btn-ghost" onclick="history.back()" style="margin-bottom:14px;">← Назад</button>
      <div class="profile-hdr">
        ${avatarHTML(emp.name, emp.color, 64)}
        <div style="flex:1;">
          <div class="profile-name">${emp.name}</div>
          <div class="profile-sv-tag">СВ: <b>${emp.sv||'—'}</b></div>
          <div class="txt-muted txt-sm" style="margin-top:4px;">${emp.line||'—'} · РГ: ${emp.rg||'—'} · ${emp.graphSurv||'—'}</div>
          <div style="margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            ${badge(sc.status)}
            ${isWork?`<span class="txt-muted txt-sm"><b>${sc.shiftStart}–${sc.shiftEnd}</b></span>`:''}
            <button class="btn btn-sm btn-ghost" onclick="toggleFav('${safeName}');renderProfile('${safeName}')" style="color:${isFav?'#f59e0b':'var(--txt-muted)'};">
              ${isFav?'★ В избранном':'☆ Добавить'}
            </button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div class="card-hdr"><span class="card-title">📅 Неделя</span></div>
        <div class="card-body"><div class="profile-week">${weekHTML}</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${breaksHTML}
          <div class="card">
            <div class="card-hdr"><span class="card-title">📊 Месяц</span></div>
            <div class="card-body">
              <div class="stats-grid" style="grid-template-columns:repeat(2,1fr);">
                <div class="stat-card"><div class="stat-card-label">Рабочих</div><div class="stat-card-value" style="color:var(--c-work);font-size:1.4rem;">${mSt.work}</div></div>
                <div class="stat-card"><div class="stat-card-label">Ночных</div><div class="stat-card-value" style="color:var(--c-night);font-size:1.4rem;">${mSt.night}</div></div>
                <div class="stat-card"><div class="stat-card-label">Отпуск</div><div class="stat-card-value" style="color:var(--c-vac);font-size:1.4rem;">${mSt.vac}</div></div>
                <div class="stat-card"><div class="stat-card-label">Больничный</div><div class="stat-card-value" style="color:var(--c-sick);font-size:1.4rem;">${mSt.sick}</div></div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="card">
            <div class="card-hdr"><span class="card-title">ℹ️ Информация</span></div>
            <div class="card-body">
              ${[['ФИО',emp.name],['Линия',emp.line],['РГ',emp.rg],['Супервайзер',emp.sv],['График',emp.graphSurv],['Дата приёма',emp.hireDate]].map(([l,v])=>`
                <div class="info-row"><span class="info-label">${l}</span><span class="info-val">${v||'—'}</span></div>`).join('')}
              <div class="info-row"><span class="info-label">Статус</span><span class="info-val">${badge(sc.status)}</span></div>
            </div>
          </div>
          <div class="card" style="margin-top:16px;">
            <div class="card-hdr"><span class="card-title">✏️ Изменить статус</span></div>
            <div class="card-body">
              <div class="form-row">
                <label>Статус на ${S.date.getDate()} ${MONTHS_GEN[S.date.getMonth()]}</label>
                <select id="editStatus" onchange="previewStatusChange(this.value)">
                  ${['work','21','9','ОТ','БЛ','УО','ОЗ','НЯ','off'].map(s=>`<option value="${s}" ${sc.status===s?'selected':''}>${STATUS_LABEL[s]}</option>`).join('')}
                </select>
              </div>
              <div id="editTimeFields" style="${isWork?'':'display:none'}">
                <div class="form-row"><label>Начало</label><input type="time" id="editStart" value="${sc.shiftStart||'09:00'}" /></div>
                <div class="form-row"><label>Конец</label><input type="time" id="editEnd" value="${sc.shiftEnd||'18:00'}" /></div>
              </div>
              <button class="btn btn-primary" style="margin-top:12px;width:100%;" onclick="saveStatusEdit('${emp.name}')">Сохранить изменение</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);
}

window.previewStatusChange = function(val) {
  const show = ['work','21','9'].includes(val);
  const f = el('editTimeFields');
  if (f) f.style.display = show ? '' : 'none';
};

window.saveStatusEdit = function(empName) {
  const emp = S.data.find(e=>e.name===empName);
  if (!emp) return;
  const dk  = dateKey(S.date);
  const st  = el('editStatus').value;
  const cur = emp.schedule[dk] || {};

  if (['work','21','9'].includes(st)) {
    emp.schedule[dk] = {
      ...cur,
      status:     st,
      shiftStart: (el('editStart')||{}).value || cur.shiftStart || '09:00',
      shiftEnd:   (el('editEnd')||{}).value   || cur.shiftEnd   || '18:00',
      raw: null, // clear raw so export recalculates
    };
  } else {
    emp.schedule[dk] = { status: st, raw: null };
  }

  saveSchedule();
  renderProfile(empName);
  toast('✅ Изменение сохранено', 'success');
};

// ═══════════════════ IMPORT PAGE ═════════════════

function renderImport() {
  setHTML('importContent', `
    <div class="import-two-col">

      <!-- Zone 1: Schedule -->
      <div class="import-zone" id="zone1">
        <div class="drop-zone" id="dropZone1" onclick="el('fi1').click()">
          <div class="drop-icon">📊</div>
          <div class="drop-title">Файл расписания</div>
          <div class="drop-sub">(формат: ФИО + 5 ячеек/день)</div>
          <button class="btn btn-primary" type="button">Выбрать .xlsx</button>
          <div class="drop-note">${window.XLSX_AVAILABLE?'✅ SheetJS загружен':'⚠️ SheetJS не загружен — нужен интернет'}</div>
        </div>
        <input type="file" id="fi1" accept=".xlsx,.xls,.json" style="display:none;" onchange="handleFile1(this)" />
        <div id="preview1" class="import-preview"></div>
      </div>

      <!-- Zone 2: Breaks -->
      <div class="import-zone" id="zone2">
        <div class="drop-zone" id="dropZone2" onclick="el('fi2').click()">
          <div class="drop-icon">☕</div>
          <div class="drop-title">Файл перерывов</div>
          <div class="drop-sub">(формат: ФИО + Смена + 10-мин. слоты)</div>
          <button class="btn btn-primary" type="button">Выбрать .xlsx</button>
          <div class="drop-note">${S.breaks.length?`✅ Загружено ${S.breaks.length} сотр.`:'Не загружен'}</div>
        </div>
        <input type="file" id="fi2" accept=".xlsx,.xls,.json" style="display:none;" onchange="handleFile2(this)" />
        <div id="preview2" class="import-preview"></div>
      </div>
    </div>

    <div class="import-actions">
      <div class="card">
        <div class="card-hdr"><span class="card-title">💾 Управление данными</span></div>
        <div class="card-body" style="display:flex;gap:10px;flex-wrap:wrap;">
          <div>
            <div class="txt-sm txt-muted">Сотрудников в системе</div>
            <div style="font-size:1.5rem;font-weight:700;color:var(--primary);" id="empCountBadge">${S.data.length}</div>
          </div>
          <div>
            <div class="txt-sm txt-muted">Записей перерывов</div>
            <div style="font-size:1.5rem;font-weight:700;color:var(--primary);">${S.breaks.length}</div>
          </div>
          <div style="flex:1;display:flex;align-items:flex-end;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
            <button class="btn btn-outline" onclick="exportJSON()">💾 Резервная копия JSON</button>
            <button class="btn btn-outline" onclick="el('fiJson').click()">📂 Загрузить JSON</button>
            <button class="btn btn-danger" onclick="clearAllData()">🗑 Очистить всё</button>
          </div>
        </div>
      </div>
      <input type="file" id="fiJson" accept=".json" style="display:none;" onchange="loadJSON(this)" />
    </div>
  `);

  setupDragDrop('dropZone1', file => processScheduleFile(file));
  setupDragDrop('dropZone2', file => processBreaksFile(file));
}

function setupDragDrop(zoneId, handler) {
  const dz = el(zoneId);
  if (!dz) return;
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) handler(f);
  });
}

window.handleFile1 = function(inp) { if(inp.files[0]) processScheduleFile(inp.files[0]); };
window.handleFile2 = function(inp) { if(inp.files[0]) processBreaksFile(inp.files[0]); };

function processScheduleFile(file) {
  if (file.name.endsWith('.json')) { loadJSONFile(file); return; }
  if (!window.XLSX_AVAILABLE) { toast('SheetJS не загружен (нужен интернет)', 'warning'); return; }
  toast('⏳ Читаю файл расписания…');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type:'array', cellDates:false });
      const { employees, meta } = parseScheduleWorkbook(wb);
      S.data = employees;
      saveSchedule();
      toast(`✅ Расписание: ${employees.length} сотрудников`, 'success');
      showImportPreview('preview1', employees, meta);
      el('empCountBadge') && (el('empCountBadge').textContent = employees.length);
      updateSidebarStatus();
    } catch(err) {
      console.error(err);
      toast('❌ Ошибка чтения: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function processBreaksFile(file) {
  if (!window.XLSX_AVAILABLE) { toast('SheetJS не загружен', 'warning'); return; }
  toast('⏳ Читаю файл перерывов…');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type:'array' });
      const breaks = parseBreaksWorkbook(wb);
      S.breaks = breaks;
      saveBreaks();
      toast(`✅ Перерывы: ${breaks.length} сотрудников`, 'success');
      showBreaksPreview('preview2', breaks);
    } catch(err) {
      console.error(err);
      toast('❌ Ошибка: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function showImportPreview(previewId, emps, meta) {
  const prev = el(previewId);
  if (!prev) return;
  const months = (meta?.months||[]).map(m=>m.sheetName).join(', ');
  prev.innerHTML = `
    <div class="card" style="margin-top:12px;">
      <div class="card-hdr"><span class="card-title">✅ Загружено: ${emps.length} сотрудников</span>${months?`<span class="txt-muted txt-sm">${months}</span>`:''}</div>
      <div class="card-body" style="overflow-x:auto;">
        <table class="emp-table">
          <thead><tr><th>ФИО</th><th>РГ</th><th>СВ</th><th>График</th><th>Дней</th></tr></thead>
          <tbody>${emps.slice(0,15).map(e=>`<tr><td>${e.name}</td><td>${e.rg||'—'}</td><td>${e.sv||'—'}</td><td>${e.graphSurv||'—'}</td><td>${Object.keys(e.schedule||{}).length}</td></tr>`).join('')}
          ${emps.length>15?`<tr><td colspan="5" class="txt-muted" style="text-align:center;">… ещё ${emps.length-15}</td></tr>`:''}</tbody>
        </table>
      </div>
    </div>
  `;
}

function showBreaksPreview(previewId, breaks) {
  const prev = el(previewId);
  if (!prev) return;
  prev.innerHTML = `
    <div class="card" style="margin-top:12px;">
      <div class="card-hdr"><span class="card-title">✅ Загружено: ${breaks.length} сотрудников</span></div>
      <div class="card-body" style="overflow-x:auto;">
        <table class="emp-table">
          <thead><tr><th>ФИО</th><th>Смена</th><th>СВ</th><th>Перерывов</th></tr></thead>
          <tbody>${breaks.slice(0,15).map(b=>`<tr><td>${b.name}</td><td>${b.shift}</td><td>${b.sv}</td><td>${(b.breaks||[]).length}</td></tr>`).join('')}
          ${breaks.length>15?`<tr><td colspan="4" class="txt-muted" style="text-align:center;">… ещё ${breaks.length-15}</td></tr>`:''}</tbody>
        </table>
      </div>
    </div>
  `;
}

window.loadJSON = function(inp) {
  if (!inp.files[0]) return;
  loadJSONFile(inp.files[0]);
};

function loadJSONFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.schedule && Array.isArray(data.schedule)) {
        S.data   = data.schedule;
        S.breaks = data.breaks || [];
        saveSchedule(); saveBreaks();
        toast(`✅ JSON загружен: ${S.data.length} сотр.`, 'success');
        renderImport();
      } else if (Array.isArray(data)) {
        S.data = data;
        saveSchedule();
        toast(`✅ JSON загружен: ${data.length} сотр.`, 'success');
        renderImport();
      } else { toast('❌ Неверный формат JSON', 'error'); }
    } catch { toast('❌ Ошибка JSON', 'error'); }
  };
  reader.readAsText(file);
}

window.clearAllData = function() {
  if (!confirm('Удалить все данные? Это действие нельзя отменить.')) return;
  S.data = []; S.breaks = [];
  saveSchedule(); saveBreaks();
  renderImport();
  toast('Данные очищены', 'warning');
};

// ═══════════════════ EXPORT PAGE ═════════════════

function renderExport() {
  setHTML('exportContent', `
    <div class="export-grid">

      <div class="export-card">
        <div class="export-icon">📊</div>
        <div class="export-title">Расписание .xlsx</div>
        <div class="export-desc">Экспорт в исходном формате файла 1<br>(5 ячеек на день, все листы по месяцам)</div>
        <button class="btn btn-primary w-full" onclick="exportScheduleExcel()">Скачать расписание</button>
      </div>

      <div class="export-card">
        <div class="export-icon">☕</div>
        <div class="export-title">Перерывы .xlsx</div>
        <div class="export-desc">Экспорт в исходном формате файла 2<br>(10-минутные слоты: перерыв/обед/ужин)</div>
        <button class="btn btn-primary w-full" onclick="exportBreaksExcel()">Скачать перерывы</button>
      </div>

      <div class="export-card">
        <div class="export-icon">🖼️</div>
        <div class="export-title">Timeline → PNG</div>
        <div class="export-desc">Снимок шкалы смен текущего дня<br>в высоком качестве</div>
        <button class="btn btn-outline w-full" onclick="navigate('timeline');setTimeout(()=>captureAndSave('tlWrap','Timeline_'+dateKey(S.date)+'.png'),400)">${window.H2C_AVAILABLE?'Сохранить PNG':'⚠️ html2canvas не загружен'}</button>
      </div>

      <div class="export-card">
        <div class="export-icon">☕</div>
        <div class="export-title">Перерывы → PNG</div>
        <div class="export-desc">Снимок графика перерывов<br>в высоком качестве</div>
        <button class="btn btn-outline w-full" onclick="navigate('breaks');setTimeout(()=>captureAndSave('breaksCard','Перерывы_'+dateKey(S.date)+'.png'),400)">${window.H2C_AVAILABLE?'Сохранить PNG':'⚠️ html2canvas не загружен'}</button>
      </div>

      <div class="export-card">
        <div class="export-icon">📄</div>
        <div class="export-title">PDF отчёт</div>
        <div class="export-desc">Timeline в PDF (альбомная ориентация)</div>
        <button class="btn btn-outline w-full" onclick="navigate('timeline');setTimeout(()=>captureAndPDF('tlWrap','KAORZIP_'+dateKey(S.date)+'.pdf'),400)">${window.JSPDF_AVAILABLE?'Скачать PDF':'⚠️ jsPDF не загружен'}</button>
      </div>

      <div class="export-card">
        <div class="export-icon">💾</div>
        <div class="export-title">Резервная копия</div>
        <div class="export-desc">Все данные в JSON<br>для переноса между устройствами</div>
        <button class="btn btn-outline w-full" onclick="exportJSON()">Скачать JSON</button>
      </div>

      <div class="export-card">
        <div class="export-icon">🖨️</div>
        <div class="export-title">Печать</div>
        <div class="export-desc">Отправить текущую страницу на принтер</div>
        <button class="btn btn-outline w-full" onclick="window.print()">Печать</button>
      </div>

      <div class="export-card">
        <div class="export-icon">📱</div>
        <div class="export-title">Текст / Telegram</div>
        <div class="export-desc">Сводка дня текстом — скопировать в мессенджер</div>
        <button class="btn btn-outline w-full" onclick="exportTextReport()">Копировать текст</button>
      </div>

    </div>
  `);
}

// ═══════════════════ SEARCH ══════════════════════

function initSearch() {
  const inp  = el('globalSearch');
  const drop = el('searchDropdown');
  if (!inp || !drop) return;

  inp.addEventListener('input', () => {
    const q = inp.value.trim().toLowerCase();
    if (!q || !S.data.length) { drop.classList.remove('open'); return; }
    const matches = S.data.filter(e =>
      e.name.toLowerCase().includes(q) || (e.sv||'').toLowerCase().includes(q) || (e.rg||'').toLowerCase().includes(q)
    ).slice(0, 8);
    if (!matches.length) {
      drop.innerHTML = '<div class="search-no-res">Не найдено</div>';
    } else {
      drop.innerHTML = matches.map(e => {
        const sc = getScheduleOn(e);
        const safeName = e.name.replace(/"/g, '&quot;');
        return `<div class="search-item" data-emp="${safeName}">
          <div class="search-ava" style="background:${e.color}22;color:${e.color};">${e.name.split(' ').slice(0,2).map(w=>w[0]).join('')}</div>
          <div><div class="search-name">${e.name}</div><div class="search-meta">${e.rg||''} · СВ: ${(e.sv||'').split(' ')[0]} · ${badge(sc.status)}</div></div>
        </div>`;
      }).join('');
    }
    drop.classList.add('open');
  });

  // Event delegation for click — replaces broken inline onclick
  drop.addEventListener('click', ev => {
    const item = ev.target.closest('.search-item');
    if (!item) return;
    const name = item.dataset.emp;
    if (!name) return;
    inp.value = '';
    drop.classList.remove('open');
    navigate('employee', { id: name });
  });

  document.addEventListener('click', ev => {
    if (!inp.contains(ev.target) && !drop.contains(ev.target)) drop.classList.remove('open');
  });
  inp.addEventListener('keydown', ev => { if(ev.key==='Escape'){ drop.classList.remove('open'); inp.value=''; } });
}

// ═══════════════════ DATE NAV ════════════════════

function updateDateDisplay() {
  const d = S.date;
  const btn = el('dateDisplay');
  if (btn) btn.textContent = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

function initDateNav() {
  el('prevDateBtn') && el('prevDateBtn').addEventListener('click', () => { S.date=addDays(S.date,-1); updateDateDisplay(); if(S.page!=='calendar') navigate(S.page); });
  el('nextDateBtn') && el('nextDateBtn').addEventListener('click', () => { S.date=addDays(S.date,+1); updateDateDisplay(); if(S.page!=='calendar') navigate(S.page); });
  el('todayBtn')    && el('todayBtn').addEventListener('click',    () => { S.date=new Date();       updateDateDisplay(); if(S.page!=='calendar') navigate(S.page); });
}

// ═══════════════════ SIDEBAR ═════════════════════

function initSidebar() {
  const open_  = () => { el('sidebar').classList.add('open'); el('sidebarOverlay').classList.add('open'); };
  const close_ = () => { el('sidebar').classList.remove('open'); el('sidebarOverlay').classList.remove('open'); };
  el('hamburger')     && el('hamburger').addEventListener('click', open_);
  el('sidebarClose')  && el('sidebarClose').addEventListener('click', close_);
  el('sidebarOverlay')&& el('sidebarOverlay').addEventListener('click', close_);
  qsa('.nav-link').forEach(l => l.addEventListener('click', e => {
    e.preventDefault();
    if (l.dataset.page) navigate(l.dataset.page);
    if (window.innerWidth < 768) close_();
  }));
}

function updateSidebarStatus() {
  const s = el('sidebarStatus');
  if (!s) return;
  s.textContent = S.data.length ? `${S.data.length} сотрудников` : 'Нет данных';
}

// ═══════════════════ THEME & UI ══════════════════

function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.theme);
  const b = el('themeBtn');
  if (b) b.textContent = S.theme==='dark' ? '☀️' : '🌙';
}

function toggleTheme() { S.theme = S.theme==='light'?'dark':'light'; applyTheme(); savePrefs(); }
function toggleFullscreen() { if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{}); else document.exitFullscreen(); }

// ═══════════════════ ON BREAK NOW ════════════════

function getCurrentlyOnBreak() {
  const now = new Date();
  const nowMin = now.getHours()*60 + now.getMinutes();
  if (!isToday(S.date)) return [];

  const result = [];
  S.breaks.forEach(b => {
    (b.breaks||[]).forEach(br => {
      const s = timeToMin(br.start);
      const e = timeToMin(br.end);
      if (nowMin >= s && nowMin < e) {
        result.push({ name: b.name, sv: b.sv, type: br.type, start: br.start, end: br.end, remaining: e - nowMin });
      }
    });
  });
  return result;
}

function getReturningSoon() {
  // Who will return from break within next 10 minutes
  const now = new Date();
  const nowMin = now.getHours()*60 + now.getMinutes();
  if (!isToday(S.date)) return [];

  const result = [];
  S.breaks.forEach(b => {
    (b.breaks||[]).forEach(br => {
      const s = timeToMin(br.start);
      if (s > nowMin && s - nowMin <= 10) {
        result.push({ name: b.name, sv: b.sv, type: br.type, start: br.start, end: br.end, in: s - nowMin });
      }
    });
  });
  return result;
}

// ═══════════════════ LEGEND ══════════════════════

function initLegend() {
  const list = el('legendList');
  if (list) list.innerHTML = LEGEND_ITEMS.map(it=>`
    <div class="legend-item"><div class="legend-dot" style="background:${it.color};"></div><span>${it.label}</span></div>`).join('');
  el('legendToggle') && el('legendToggle').addEventListener('click', () => el('legendPanel').classList.toggle('hidden'));
}

// ═══════════════════ UTILS ═══════════════════════

function emptyState(title, sub, icon='📭') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div>${sub?`<div class="empty-sub">${sub}</div>`:''}</div>`;
}

// ═══════════════════ INIT ════════════════════════

function init() {
  loadAll();
  applyTheme();
  // (compact mode removed)

  COLOR_MAP = buildColorMap(S.data);
  S.data.forEach(e => { if (!e.color) e.color = COLOR_MAP[e.name] || '#3b82f6'; });

  S.date     = new Date();
  S.calYear  = S.date.getFullYear();
  S.calMonth = S.date.getMonth();
  updateDateDisplay();

  initSidebar();
  initDateNav();
  initSearch();
  initLegend();

  el('themeBtn')      && el('themeBtn').addEventListener('click', toggleTheme);
  el('fullscreenBtn') && el('fullscreenBtn').addEventListener('click', toggleFullscreen);
  el('modalClose')    && el('modalClose').addEventListener('click', closeModal);
  el('modalBackdrop') && el('modalBackdrop').addEventListener('click', ev => { if(ev.target===el('modalBackdrop')) closeModal(); });

  // Timeline action buttons
  el('scrollNowBtn')    && el('scrollNowBtn').addEventListener('click', () => { const s=el('tlScroll'); if(s){ const nx=nowX(); if(nx>=0) s.scrollLeft=Math.max(0,nx-200); } });
  el('tlExportImgBtn')  && el('tlExportImgBtn').addEventListener('click', () => captureAndSave('tlWrap', `Timeline_${dateKey(S.date)}.png`));
  el('brkExportImgBtn') && el('brkExportImgBtn').addEventListener('click', () => captureAndSave('breaksCard', `Перерывы_${dateKey(S.date)}.png`));

  // Employee filters
  ['empSearch','empRGFilter','empSVFilter','empShiftFilter','empStatusFilter'].forEach(id => {
    const node = el(id);
    if (node) node.addEventListener(node.tagName==='SELECT'?'change':'input', applyEmpFilters);
  });

  // Calendar filters
  ['calEmpFilter','calRGFilter'].forEach(id => {
    const node = el(id);
    if (node) node.addEventListener('change', renderCalendar);
  });

  // Timeline filters
  ['tlRGFilter','tlSVFilter','tlShiftFilter'].forEach(id => {
    const node = el(id);
    if (node) node.addEventListener('change', renderTimeline);
  });

  // Breaks filters
  ['brkRGFilter','brkSVFilter'].forEach(id => {
    const node = el(id);
    if (node) node.addEventListener('change', renderBreaksPage);
  });

  updateSidebarStatus();
  handleHash();
  window.addEventListener('hashchange', handleHash);

  // Auto-refresh now-line every minute when timeline is open
  setInterval(() => {
    if (S.page==='timeline' && sameDay(S.date, new Date())) renderTimeline();
  }, 60000);

  // Expose globals needed for inline onclick
  window.navigate    = navigate;
  window.S           = S;
  window.el          = el;
  window.dateKey     = dateKey;
  window.calNav      = calNav;
  window.captureAndSave  = captureAndSave;
  window.captureAndPDF   = captureAndPDF;
  window.exportJSON      = exportJSON;
  window.exportScheduleExcel = exportScheduleExcel;
  window.exportBreaksExcel   = exportBreaksExcel;
  window.exportTextReport    = exportTextReport;

  console.info(`KAORZIP ready — Schedule: ${S.data.length} | Breaks: ${S.breaks.length}`);
}

document.addEventListener('DOMContentLoaded', init);
