/* ═══════════════════════════════════════════════
   KAORZIP — Employee Scheduling Dashboard
   app.js  |  Pure Vanilla JS  |  No backend
═══════════════════════════════════════════════ */

'use strict';

// ═══════════════════ CONSTANTS ═══════════════════

const STATUS = {
  WORK:    'work',
  NIGHT:   '21',
  CHANGED: '9',
  VACATION:'ОТ',
  SICK:    'БЛ',
  STUDY:   'УО',
  UNPAID:  'ОЗ',
  ABSENCE: 'НЯ',
  OFF:     'off',
};

const STATUS_LABEL = {
  work:  'Работает',  '21': 'Ночная смена',
  '9':   'Изм. смены', ОТ: 'Отпуск',
  БЛ:    'Больничный', УО:  'Уч. отпуск',
  ОЗ:    'Отпуск б/с', НЯ:  'Неявка',
  off:   'Выходной',
};

const STATUS_COLOR = {
  work:  '#3b82f6',  '21': '#8b5cf6',
  '9':   '#10b981',  ОТ:  '#64748b',
  БЛ:    '#ef4444',  УО:  '#06b6d4',
  ОЗ:    '#f97316',  НЯ:  '#dc2626',
  off:   '#94a3b8',
};

const LEGEND_ITEMS = [
  { key: 'work',  label: 'Рабочая смена',   color: '#3b82f6' },
  { key: '21',    label: 'Ночная смена',     color: '#8b5cf6' },
  { key: '9',     label: 'Изменение смены',  color: '#10b981' },
  { key: 'ОТ',    label: 'Отпуск',           color: '#64748b' },
  { key: 'БЛ',    label: 'Больничный',        color: '#ef4444' },
  { key: 'УО',    label: 'Учебный отпуск',   color: '#06b6d4' },
  { key: 'ОЗ',    label: 'Отпуск б/с',       color: '#f97316' },
  { key: 'НЯ',    label: 'Неявка',           color: '#dc2626' },
  { key: 'break', label: 'Перерыв',          color: '#f59e0b' },
  { key: 'lunch', label: 'Обед',             color: '#f97316' },
];

// Timeline: 06:00–23:00, 1px = 1 minute
const TL_START   = 6 * 60;   // 360 min
const TL_END     = 23 * 60;  // 1380 min
const TL_TOTAL   = TL_END - TL_START; // 1020 min
const TL_PX_MIN  = 2;        // 2px per minute
const TL_HOUR_W  = 60 * TL_PX_MIN; // 120px per hour

const COLORS_POOL = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
  '#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6',
];

const DAYS_RU = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const DAYS_FULL_RU = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

// ═══════════════════ STATE ══════════════════════

let S = {
  page:      'dashboard',
  date:      new Date(),
  theme:     'light',
  compact:   false,
  favorites: [],
  data:      null,
  sortCol:   'name',
  sortDir:   'asc',
  calYear:   null,
  calMonth:  null,
  tlTooltip: null,
};

// ═══════════════════ MOCK DATA ════════════════════

const DEPARTMENTS = ['Обслуживание клиентов','Кредитный отдел','Операционный отдел'];

const SUPERVISORS = [
  { name: 'Александрова Н.В.', dept: 'Обслуживание клиентов' },
  { name: 'Борисов К.А.',      dept: 'Обслуживание клиентов' },
  { name: 'Смирнова Е.П.',     dept: 'Кредитный отдел' },
  { name: 'Козлов Д.М.',       dept: 'Операционный отдел' },
  { name: 'Петрова Т.С.',      dept: 'Операционный отдел' },
];

const SHIFT_TEMPLATES = {
  '1': { start: '09:00', end: '18:00', breaks: [
    { start: '11:00', end: '11:15', type: 'break' },
    { start: '13:00', end: '14:00', type: 'lunch' },
    { start: '16:00', end: '16:15', type: 'break' },
  ]},
  '2': { start: '12:00', end: '21:00', breaks: [
    { start: '14:00', end: '14:15', type: 'break' },
    { start: '16:00', end: '17:00', type: 'lunch' },
    { start: '19:00', end: '19:15', type: 'break' },
  ]},
  '3': { start: '08:00', end: '17:00', breaks: [
    { start: '10:00', end: '10:15', type: 'break' },
    { start: '12:00', end: '13:00', type: 'lunch' },
    { start: '15:00', end: '15:15', type: 'break' },
  ]},
  'night': { start: '21:00', end: '06:00', breaks: [
    { start: '23:30', end: '23:45', type: 'break' },
    { start: '02:00', end: '02:30', type: 'lunch' },
    { start: '04:30', end: '04:45', type: 'break' },
  ]},
};

const RAW_EMPLOYEES = [
  // Dept 1 — Обслуживание клиентов / СВ: Александрова
  { id:'e01', name:'Иванова Мария Сергеевна',      dept:DEPARTMENTS[0], sv:'Александрова Н.В.', shift:'1', pos:'Старший оператор' },
  { id:'e02', name:'Петров Алексей Дмитриевич',    dept:DEPARTMENTS[0], sv:'Александрова Н.В.', shift:'1', pos:'Оператор' },
  { id:'e03', name:'Сидорова Елена Владимировна',  dept:DEPARTMENTS[0], sv:'Александрова Н.В.', shift:'2', pos:'Оператор' },
  { id:'e04', name:'Козырева Татьяна Ивановна',    dept:DEPARTMENTS[0], sv:'Александрова Н.В.', shift:'3', pos:'Оператор' },
  { id:'e05', name:'Новиков Игорь Павлович',        dept:DEPARTMENTS[0], sv:'Александрова Н.В.', shift:'2', pos:'Консультант' },
  // Dept 1 — СВ: Борисов
  { id:'e06', name:'Морозова Ольга Николаевна',    dept:DEPARTMENTS[0], sv:'Борисов К.А.', shift:'1', pos:'Оператор' },
  { id:'e07', name:'Волков Сергей Анатольевич',   dept:DEPARTMENTS[0], sv:'Борисов К.А.', shift:'1', pos:'Оператор' },
  { id:'e08', name:'Лебедева Анна Викторовна',     dept:DEPARTMENTS[0], sv:'Борисов К.А.', shift:'2', pos:'Консультант' },
  { id:'e09', name:'Соколов Дмитрий Петрович',    dept:DEPARTMENTS[0], sv:'Борисов К.А.', shift:'3', pos:'Оператор' },
  // Dept 2 — Кредитный отдел / СВ: Смирнова
  { id:'e10', name:'Захарова Наталья Юрьевна',    dept:DEPARTMENTS[1], sv:'Смирнова Е.П.', shift:'1', pos:'Кредитный специалист' },
  { id:'e11', name:'Кириллов Андрей Борисович',   dept:DEPARTMENTS[1], sv:'Смирнова Е.П.', shift:'1', pos:'Аналитик' },
  { id:'e12', name:'Орлова Светлана Михайловна',  dept:DEPARTMENTS[1], sv:'Смирнова Е.П.', shift:'2', pos:'Кредитный специалист' },
  { id:'e13', name:'Федоров Роман Константинович', dept:DEPARTMENTS[1], sv:'Смирнова Е.П.', shift:'3', pos:'Специалист' },
  { id:'e14', name:'Тихонова Юлия Александровна', dept:DEPARTMENTS[1], sv:'Смирнова Е.П.', shift:'1', pos:'Менеджер' },
  { id:'e15', name:'Ефимов Василий Геннадьевич',  dept:DEPARTMENTS[1], sv:'Смирнова Е.П.', shift:'2', pos:'Специалист' },
  // Dept 3 — Операционный отдел / СВ: Козлов
  { id:'e16', name:'Воробьева Марина Олеговна',   dept:DEPARTMENTS[2], sv:'Козлов Д.М.', shift:'1', pos:'Операционист' },
  { id:'e17', name:'Белов Максим Юрьевич',        dept:DEPARTMENTS[2], sv:'Козлов Д.М.', shift:'1', pos:'Операционист' },
  { id:'e18', name:'Громова Ирина Дмитриевна',    dept:DEPARTMENTS[2], sv:'Козлов Д.М.', shift:'2', pos:'Специалист' },
  // Dept 3 — СВ: Петрова
  { id:'e19', name:'Симонов Артём Алексеевич',    dept:DEPARTMENTS[2], sv:'Петрова Т.С.', shift:'3', pos:'Ночной оператор' },
  { id:'e20', name:'Панова Кристина Вячеславовна',dept:DEPARTMENTS[2], sv:'Петрова Т.С.', shift:'1', pos:'Операционист' },
  { id:'e21', name:'Логинов Евгений Станиславович',dept:DEPARTMENTS[2], sv:'Петрова Т.С.', shift:'2', pos:'Операционист' },
  { id:'e22', name:'Романова Вера Викторовна',    dept:DEPARTMENTS[2], sv:'Петрова Т.С.', shift:'3', pos:'Специалист' },
  { id:'e23', name:'Суворов Николай Иванович',    dept:DEPARTMENTS[2], sv:'Петрова Т.С.', shift:'1', pos:'Ст. операционист' },
  { id:'e24', name:'Крылова Диана Сергеевна',     dept:DEPARTMENTS[2], sv:'Козлов Д.М.', shift:'2', pos:'Операционист' },
  { id:'e25', name:'Медведев Илья Романович',     dept:DEPARTMENTS[2], sv:'Козлов Д.М.', shift:'3', pos:'Ночной специалист' },
];

function buildColorMap() {
  const map = {};
  RAW_EMPLOYEES.forEach((e, i) => {
    map[e.id] = COLORS_POOL[i % COLORS_POOL.length];
  });
  return map;
}
const EMP_COLORS = buildColorMap();

// Generate a realistic schedule for May 2026
function generateSchedule(emp) {
  const year = 2026, month = 4; // May = 4 (0-indexed)
  const daysInMonth = 31;
  const schedule = {};

  // Assign vacation/sick periods for some employees
  const specialDays = {};

  if (emp.id === 'e03') { // vacation 10-20 May
    for (let d = 10; d <= 20; d++) specialDays[d] = STATUS.VACATION;
  }
  if (emp.id === 'e08') { // sick 5-12 May
    for (let d = 5; d <= 12; d++) specialDays[d] = STATUS.SICK;
  }
  if (emp.id === 'e13') { // study leave 1-7
    for (let d = 1; d <= 7; d++) specialDays[d] = STATUS.STUDY;
  }
  if (emp.id === 'e18') { // unpaid leave 15-17
    for (let d = 15; d <= 17; d++) specialDays[d] = STATUS.UNPAID;
  }
  if (emp.id === 'e22') { // absence on 8
    specialDays[8] = STATUS.ABSENCE;
  }
  if (emp.id === 'e19' || emp.id === 'e25') { // night shift workers
    emp._nightShift = true;
  }
  if (emp.id === 'e05') { // changed shift on 19
    specialDays[19] = STATUS.CHANGED;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    if (specialDays[d]) {
      const sp = specialDays[d];
      if (sp === STATUS.CHANGED) {
        // Changed shift — use shift 2 template instead of 1
        schedule[dateKey] = {
          status: STATUS.CHANGED,
          shiftStart: '10:00',
          shiftEnd: '19:00',
          breaks: [
            { start: '12:00', end: '12:15', type: 'break' },
            { start: '14:00', end: '15:00', type: 'lunch' },
            { start: '17:00', end: '17:15', type: 'break' },
          ],
        };
      } else {
        schedule[dateKey] = { status: sp };
      }
      continue;
    }

    // Night shift workers work Tue, Thu, Sat nights (21:00–06:00)
    if (emp._nightShift) {
      if (dow === 2 || dow === 4 || dow === 6) {
        schedule[dateKey] = {
          status: STATUS.NIGHT,
          shiftStart: '21:00',
          shiftEnd: '06:00',
          breaks: SHIFT_TEMPLATES.night.breaks,
        };
      } else {
        schedule[dateKey] = { status: STATUS.OFF };
      }
      continue;
    }

    // Regular employees: Mon–Fri work, Sat by shift
    const isWorkday = dow >= 1 && dow <= 5;
    const isSat = dow === 6;

    let works = false;
    if (emp.shift === '1' && isWorkday) works = true;
    if (emp.shift === '2' && isWorkday) works = true;
    if (emp.shift === '3' && isWorkday) works = true;
    if (emp.shift === '2' && isSat) works = true; // shift 2 works Saturdays too

    if (works) {
      const tpl = SHIFT_TEMPLATES[emp.shift];
      schedule[dateKey] = {
        status: STATUS.WORK,
        shiftStart: tpl.start,
        shiftEnd: tpl.end,
        breaks: tpl.breaks,
      };
    } else {
      schedule[dateKey] = { status: STATUS.OFF };
    }
  }
  return schedule;
}

function buildMockData() {
  return RAW_EMPLOYEES.map(e => ({
    ...e,
    color: EMP_COLORS[e.id],
    schedule: generateSchedule({ ...e }),
  }));
}

// ═══════════════════ LOCALSTORAGE ════════════════

const LS_KEY = 'kaorzip_data';
const LS_PREF = 'kaorzip_prefs';

function saveData(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch(e) {}
}

function loadData() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function savePrefs() {
  try {
    localStorage.setItem(LS_PREF, JSON.stringify({
      theme: S.theme,
      compact: S.compact,
      favorites: S.favorites,
    }));
  } catch(e) {}
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_PREF);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p.theme)     S.theme     = p.theme;
    if (p.compact)   S.compact   = p.compact;
    if (p.favorites) S.favorites = p.favorites;
  } catch(e) {}
}

// ═══════════════════ DATE UTILS ══════════════════

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function parseDate(str) {
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}

function formatDisplayDate(d) {
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}, ${DAYS_FULL_RU[d.getDay()]}`;
}

function formatShortDate(d) {
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

function timeToMin(t) {
  const [h,m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToTime(m) {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function sameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function isToday(d) { return sameDay(d, new Date()); }

// ═══════════════════ DOM HELPERS ═════════════════

function el(id) { return document.getElementById(id); }
function qs(sel, ctx=document) { return ctx.querySelector(sel); }
function qsa(sel, ctx=document) { return [...ctx.querySelectorAll(sel)]; }

function html(tag, attrs={}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e[k] = v;
    else e.setAttribute(k, v);
  });
  children.forEach(c => {
    if (c == null || c === false) return;
    e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

function setHTML(id, content) {
  const node = typeof id === 'string' ? el(id) : id;
  if (node) node.innerHTML = content;
}

function makeAvatar(name, color, size=36) {
  const initials = name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return `<div class="emp-avatar" style="width:${size}px;height:${size}px;background:${color}20;color:${color};font-size:${size*.33}px;">${initials}</div>`;
}

function avatarSvg(name, color) {
  const initials = name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return `<span class="emp-avatar-sm" style="background:${color}20;color:${color};">${initials}</span>`;
}

function badge(status) {
  const label = STATUS_LABEL[status] || status;
  const cls = {
    work:'badge-work','21':'badge-night','9':'badge-changed',
    ОТ:'badge-vacation',БЛ:'badge-sick',УО:'badge-study',
    ОЗ:'badge-unpaid',НЯ:'badge-absence',off:'',
  }[status] || '';
  return `<span class="badge ${cls}">${label}</span>`;
}

// ═══════════════════ TOAST ═══════════════════════

function toast(msg, type='') {
  const t = html('div', {class:`toast ${type?'toast-'+type:''}`}, msg);
  el('toastStack').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ═══════════════════ MODAL ═══════════════════════

function openModal(title, bodyHTML) {
  el('modalTitle').textContent = title;
  setHTML('modalBody', bodyHTML);
  el('modalBackdrop').classList.remove('hidden');
}

function closeModal() {
  el('modalBackdrop').classList.add('hidden');
}

// ═══════════════════ NAVIGATION ══════════════════

const PAGE_LABELS = {
  dashboard:'Dashboard', timeline:'Timeline', breaks:'Перерывы',
  calendar:'Календарь', employees:'Сотрудники', favorites:'Избранные',
  import:'Импорт Excel', export:'Экспорт', employee:'Профиль',
};

function navigate(page, params={}) {
  // Hide all pages
  qsa('.page').forEach(p => p.classList.add('hidden'));
  // Show target
  const target = el(`page-${page}`);
  if (!target) return;
  target.classList.remove('hidden');

  // Update nav links
  qsa('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  S.page = page;
  el('breadcrumb').textContent = PAGE_LABELS[page] || page;

  // Render page content
  switch (page) {
    case 'dashboard':  renderDashboard();  break;
    case 'timeline':   renderTimeline();   break;
    case 'breaks':     renderBreaks();     break;
    case 'calendar':   renderCalendar();   break;
    case 'employees':  renderEmployees();  break;
    case 'favorites':  renderFavorites();  break;
    case 'import':     renderImport();     break;
    case 'export':     renderExport();     break;
    case 'employee':   renderProfile(params.id); break;
  }

  window.location.hash = page;
}

function handleHash() {
  const hash = window.location.hash.slice(1);
  // Handle ?user=xxx
  const uParam = new URLSearchParams(window.location.search).get('user');
  if (uParam) {
    const emp = S.data.find(e => e.id === uParam || e.name.toLowerCase().includes(uParam.toLowerCase()));
    if (emp) { navigate('employee', { id: emp.id }); return; }
  }
  if (hash && PAGE_LABELS[hash]) navigate(hash);
  else navigate('dashboard');
}

// ═══════════════════ FILTERS HELPERS ═════════════

function getUnique(arr, key) {
  return [...new Set(arr.map(e => e[key]))].filter(Boolean).sort();
}

function populateSelect(id, values, currentVal='') {
  const s = el(id);
  if (!s) return;
  const firstOpt = s.options[0];
  s.innerHTML = '';
  s.appendChild(firstOpt);
  values.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v;
    if (v === currentVal) o.selected = true;
    s.appendChild(o);
  });
}

function filterData(employees, opts={}) {
  let data = [...employees];
  if (opts.dept)   data = data.filter(e => e.dept  === opts.dept);
  if (opts.sv)     data = data.filter(e => e.sv    === opts.sv);
  if (opts.shift)  data = data.filter(e => e.shift === opts.shift);
  if (opts.status) {
    const dk = dateKey(S.date);
    data = data.filter(e => (e.schedule[dk]||{}).status === opts.status);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    data = data.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.dept.toLowerCase().includes(q) ||
      e.sv.toLowerCase().includes(q) ||
      e.pos.toLowerCase().includes(q)
    );
  }
  return data;
}

function getScheduleOn(emp, d=S.date) {
  return emp.schedule[dateKey(d)] || { status: STATUS.OFF };
}

// ═══════════════════ TIMELINE UTILS ══════════════

function tMinToX(tMin) {
  return (tMin - TL_START) * TL_PX_MIN;
}

function tStrToX(tStr) {
  return tMinToX(timeToMin(tStr));
}

function tDurPx(start, end) {
  const s = timeToMin(start);
  let e = timeToMin(end);
  if (e < s) e += 24 * 60; // overnight
  return (e - s) * TL_PX_MIN;
}

function nowX() {
  const now = new Date();
  const min = now.getHours() * 60 + now.getMinutes();
  if (min < TL_START || min > TL_END) return -1;
  return tMinToX(min);
}

// ═══════════════════ DASHBOARD ═══════════════════

function renderDashboard() {
  const dk = dateKey(S.date);
  const all = S.data;

  el('dashSubtitle').textContent = formatDisplayDate(S.date);

  // Stats
  const stats = { work:0, night:0, changed:0, vacation:0, sick:0, study:0, unpaid:0, absence:0, off:0 };
  all.forEach(e => {
    const sc = getScheduleOn(e);
    const st = sc.status;
    if (st === STATUS.WORK)     stats.work++;
    else if (st === STATUS.NIGHT)   stats.night++;
    else if (st === STATUS.CHANGED) stats.changed++;
    else if (st === STATUS.VACATION)stats.vacation++;
    else if (st === STATUS.SICK)    stats.sick++;
    else if (st === STATUS.STUDY)   stats.study++;
    else if (st === STATUS.UNPAID)  stats.unpaid++;
    else if (st === STATUS.ABSENCE) stats.absence++;
    else stats.off++;
  });

  const totalActive = stats.work + stats.night + stats.changed;

  const deptFilter = (el('dashDeptFilter')||{}).value || '';
  const depts = getUnique(all, 'dept');
  populateSelect('dashDeptFilter', depts);

  // Dept stats
  const deptStats = {};
  DEPARTMENTS.forEach(d => {
    const empInDept = all.filter(e => e.dept === d);
    const working = empInDept.filter(e => {
      const st = getScheduleOn(e).status;
      return st === STATUS.WORK || st === STATUS.NIGHT || st === STATUS.CHANGED;
    }).length;
    deptStats[d] = { total: empInDept.length, working };
  });

  // Currently working employees (sample)
  const workingNow = all.filter(e => {
    const st = getScheduleOn(e).status;
    return st === STATUS.WORK || st === STATUS.NIGHT || st === STATUS.CHANGED;
  }).slice(0, 8);

  const notWorking = all.filter(e => {
    const st = getScheduleOn(e).status;
    return st !== STATUS.WORK && st !== STATUS.NIGHT && st !== STATUS.CHANGED && st !== STATUS.OFF;
  }).slice(0, 6);

  const statsCards = [
    { icon:'👥', label:'Всего сотрудников', value: all.length, meta:'в системе', color: '#3b82f6' },
    { icon:'✅', label:'Работают сегодня', value: totalActive, meta:`из ${all.length}`, color: '#10b981' },
    { icon:'🌙', label:'Ночная смена', value: stats.night, meta:'сотрудников', color: '#8b5cf6' },
    { icon:'🔄', label:'Изм. смены', value: stats.changed, meta:'сотрудников', color: '#10b981' },
    { icon:'🏖️', label:'В отпуске', value: stats.vacation, meta:'сотрудников', color: '#64748b' },
    { icon:'🤒', label:'На больничном', value: stats.sick, meta:'сотрудников', color: '#ef4444' },
    { icon:'📚', label:'Учебный отпуск', value: stats.study, meta:'сотрудников', color: '#06b6d4' },
    { icon:'⚠️', label:'Неявка', value: stats.absence, meta:'сотрудников', color: '#dc2626' },
  ];

  const statsHTML = `
    <div class="stats-grid">
      ${statsCards.map(c => `
        <div class="stat-card">
          <div class="stat-card-icon" style="background:${c.color}18;">${c.icon}</div>
          <div class="stat-card-label">${c.label}</div>
          <div class="stat-card-value" style="color:${c.color};">${c.value}</div>
          <div class="stat-card-meta">${c.meta}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Working employees list
  const workingListHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">✅ Работают сегодня (${totalActive})</span></div>
      <div class="card-body">
        ${workingNow.length ? workingNow.map(e => {
          const sc = getScheduleOn(e);
          const col = e.color;
          return `
            <div class="employee-row" onclick="navigate('employee',{id:'${e.id}'})" style="cursor:pointer;">
              ${makeAvatar(e.name, col, 36)}
              <div class="emp-info">
                <div class="emp-name">${e.name}</div>
                <div class="emp-meta">${e.dept} · СВ: ${e.sv.split(' ')[0]}</div>
              </div>
              <div class="emp-badge">${badge(sc.status)}</div>
            </div>
          `;
        }).join('') : '<div class="empty-state"><div class="empty-state-text">Нет данных</div></div>'}
      </div>
    </div>
  `;

  // Not working list
  const notWorkingHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">⏸ Не работают</span></div>
      <div class="card-body">
        ${notWorking.length ? notWorking.map(e => {
          const sc = getScheduleOn(e);
          return `
            <div class="employee-row" onclick="navigate('employee',{id:'${e.id}'})" style="cursor:pointer;">
              ${makeAvatar(e.name, e.color, 36)}
              <div class="emp-info">
                <div class="emp-name">${e.name}</div>
                <div class="emp-meta">${e.dept}</div>
              </div>
              <div class="emp-badge">${badge(sc.status)}</div>
            </div>
          `;
        }).join('') : '<div class="empty-state-text txt-secondary txt-sm" style="padding:16px 0;">Все сотрудники работают</div>'}
      </div>
    </div>
  `;

  // Department analytics
  const deptAnalytics = `
    <div class="card">
      <div class="card-header"><span class="card-title">📊 Аналитика по отделам</span></div>
      <div class="card-body">
        <div class="mini-bar-wrap">
          ${DEPARTMENTS.map(d => {
            const ds = deptStats[d];
            const pct = ds.total ? Math.round(ds.working/ds.total*100) : 0;
            return `
              <div class="mini-bar-row">
                <span class="mini-bar-label" title="${d}">${d.split(' ')[0]}</span>
                <div class="mini-bar-track">
                  <div class="mini-bar-fill" style="width:${pct}%;background:var(--primary);"></div>
                </div>
                <span class="mini-bar-count">${ds.working}/${ds.total}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div class="divider"></div>
        ${DEPARTMENTS.map(d => `
          <div class="mini-bar-row" style="margin-bottom:4px;">
            <span style="font-size:.82rem;font-weight:600;">${d}</span>
          </div>
          ${SUPERVISORS.filter(sv=>sv.dept===d).map(sv => {
            const svEmps = all.filter(e => e.sv === sv.name);
            const svWork = svEmps.filter(e => {
              const st = getScheduleOn(e).status;
              return st === STATUS.WORK || st === STATUS.NIGHT || st === STATUS.CHANGED;
            }).length;
            return `<div class="mini-bar-row" style="padding-left:12px;margin-bottom:2px;">
              <span class="mini-bar-label txt-sm">${sv.name.split(' ')[0]}</span>
              <div class="mini-bar-track">
                <div class="mini-bar-fill" style="width:${svEmps.length?svWork/svEmps.length*100:0}%;background:var(--c-changed);"></div>
              </div>
              <span class="mini-bar-count">${svWork}/${svEmps.length}</span>
            </div>`;
          }).join('')}
        `).join('<div class="divider" style="margin:10px 0;"></div>')}
      </div>
    </div>
  `;

  setHTML('dashContent', `
    ${statsHTML}
    <div class="dash-grid">
      <div class="dash-col">
        ${workingListHTML}
      </div>
      <div class="dash-col">
        ${notWorkingHTML}
        ${deptAnalytics}
      </div>
    </div>
  `);
}

// ═══════════════════ TIMELINE ════════════════════

function renderTimeline() {
  el('timelineSubtitle').textContent = formatDisplayDate(S.date);

  const depts = getUnique(S.data, 'dept');
  const svs   = getUnique(S.data, 'sv');
  populateSelect('tlDeptFilter', depts);
  populateSelect('tlSVFilter', svs);

  const dept  = (el('tlDeptFilter')||{}).value || '';
  const sv    = (el('tlSVFilter')||{}).value || '';
  const shift = (el('tlShiftFilter')||{}).value || '';

  let filtered = filterData(S.data, { dept, sv, shift });

  // Remove employees who are off
  filtered = filtered.filter(e => {
    const sc = getScheduleOn(e);
    return sc.status !== STATUS.OFF;
  });

  // Hours to show: 06–23
  const hours = [];
  for (let h = 6; h <= 23; h++) hours.push(h);
  const now = new Date();
  const nowHour = now.getHours();
  const nowX_px = nowX();
  const isTodayView = sameDay(S.date, new Date());

  const timeAxisHTML = hours.map(h => `
    <div class="tl-hour${isTodayView && h === nowHour ? ' current-hour' : ''}">${String(h).padStart(2,'0')}:00</div>
  `).join('');

  // Group by dept
  const grouped = {};
  DEPARTMENTS.forEach(d => {
    const emps = filtered.filter(e => e.dept === d);
    if (emps.length) grouped[d] = emps;
  });

  const gridLines = hours.map(() => `<div class="tl-grid-line"></div>`).join('');

  const nowLineHTML = (isTodayView && nowX_px >= 0) ? `
    <div class="tl-now-line" style="left:${nowX_px}px;" id="tlNowLine">
      <div class="tl-now-dot"></div>
      <div class="tl-now-label">${minToTime(now.getHours()*60+now.getMinutes())}</div>
    </div>
  ` : '';

  function buildRow(e) {
    const sc = getScheduleOn(e);
    const col = e.color;
    const initials = e.name.split(' ').slice(0,2).map(w=>w[0]).join('');

    let blocksHTML = '';

    if (sc.status === STATUS.WORK || sc.status === STATUS.NIGHT || sc.status === STATUS.CHANGED) {
      const clsMap = { work:'work', '21':'night', '9':'changed' };
      const bCls = clsMap[sc.status] || 'work';
      const x = tStrToX(sc.shiftStart);
      const w = tDurPx(sc.shiftStart, sc.shiftEnd);
      const label = `${sc.shiftStart}–${sc.shiftEnd}`;

      blocksHTML += `
        <div class="tl-block tl-block-${bCls}"
          style="left:${x}px;width:${w}px;"
          data-tip="${e.name}|${STATUS_LABEL[sc.status]}|${label}"
          onclick="showEmpModal('${e.id}')">
          ${w > 80 ? label : ''}
        </div>`;

      // Breaks
      (sc.breaks||[]).forEach(br => {
        const bx = tStrToX(br.start);
        const bw = tDurPx(br.start, br.end);
        const isl = br.type === 'lunch';
        blocksHTML += `
          <div class="tl-block tl-block-${isl?'lunch':'break'}"
            style="left:${bx}px;width:${Math.max(bw,6)}px;"
            data-tip="${e.name}|${isl?'Обед':'Перерыв'}|${br.start}–${br.end}">
            ${bw > 50 ? (isl?'🍽':'☕') : ''}
          </div>`;
      });
    } else if (sc.status !== STATUS.OFF) {
      // Vacation, sick, etc — full-day block
      blocksHTML += `
        <div class="tl-block tl-block-${sc.status==='БЛ'?'sick':sc.status==='ОТ'?'vacation':'absence'}"
          style="left:0;width:${TL_TOTAL*TL_PX_MIN}px;"
          data-tip="${e.name}|${STATUS_LABEL[sc.status]}|весь день"
          onclick="showEmpModal('${e.id}')">
          ${STATUS_LABEL[sc.status]}
        </div>`;
    }

    return `
      <div class="timeline-row">
        <div class="tl-emp-cell" onclick="navigate('employee',{id:'${e.id}'})">
          <div class="tl-emp-avatar" style="background:${col}20;color:${col};">${initials}</div>
          <div>
            <div class="tl-emp-name">${e.name.split(' ')[0]} ${e.name.split(' ')[1]||''}</div>
            <div class="tl-emp-meta">Смена ${e.shift} · ${e.sv.split(' ')[0]}</div>
          </div>
        </div>
        <div class="tl-blocks-cell" style="width:${TL_TOTAL*TL_PX_MIN}px;">
          <div class="tl-grid-lines">${gridLines}</div>
          ${blocksHTML}
          ${(isTodayView && nowX_px >= 0) ? `<div class="tl-now-line" style="left:${nowX_px}px;"></div>` : ''}
        </div>
      </div>
    `;
  }

  const groupsHTML = Object.entries(grouped).map(([dName, emps]) => `
    <div class="timeline-group" data-dept="${dName}">
      <div class="timeline-group-header" onclick="toggleGroup(this)">
        <span class="tl-collapse-icon">▼</span>
        <span>${dName}</span>
        <span style="margin-left:auto;font-size:.75rem;color:var(--txt-3);">${emps.length} чел.</span>
      </div>
      <div class="tl-group-rows">
        ${emps.map(e => buildRow(e)).join('')}
      </div>
    </div>
  `).join('');

  const totalWidth = TL_TOTAL * TL_PX_MIN + 200;

  setHTML('timelineContent', `
    <div class="timeline-wrap" id="tlWrap">
      <div class="timeline-scroll" id="tlScroll">
        <div class="timeline-inner" style="width:${totalWidth}px;">
          <div class="timeline-header">
            <div class="tl-name-col">Сотрудник</div>
            <div class="tl-time-axis">${timeAxisHTML}</div>
          </div>
          ${groupsHTML || '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Нет сотрудников за выбранный день</div></div>'}
        </div>
      </div>
    </div>
    ${nowLineHTML ? '' : ''}
  `);

  // Tooltip
  initTimelineTooltip();

  // Auto-scroll to now if today
  if (isTodayView && nowX_px > 0) {
    setTimeout(() => {
      const scr = el('tlScroll');
      if (scr) scr.scrollLeft = Math.max(0, nowX_px - 200);
    }, 100);
  }
}

function toggleGroup(header) {
  const group = header.parentElement;
  const rows = qs('.tl-group-rows', group);
  const icon = qs('.tl-collapse-icon', header);
  const collapsed = rows.style.display === 'none';
  rows.style.display = collapsed ? '' : 'none';
  icon.textContent = collapsed ? '▼' : '▶';
}

function initTimelineTooltip() {
  // Create tooltip if not exists
  let tip = el('tlTooltipEl');
  if (!tip) {
    tip = html('div', { id: 'tlTooltipEl', class: 'tl-tooltip' });
    document.body.appendChild(tip);
  }

  document.addEventListener('mousemove', onTipMove);

  qsa('[data-tip]').forEach(block => {
    block.addEventListener('mouseenter', function(ev) {
      const parts = this.dataset.tip.split('|');
      tip.innerHTML = `<strong>${parts[0]}</strong>${parts[1]}<br><span style="opacity:.7">${parts[2]}</span>`;
      tip.classList.add('show');
    });
    block.addEventListener('mouseleave', () => tip.classList.remove('show'));
  });
}

function onTipMove(ev) {
  const tip = el('tlTooltipEl');
  if (!tip || !tip.classList.contains('show')) return;
  tip.style.left = (ev.clientX + 12) + 'px';
  tip.style.top  = (ev.clientY - 40) + 'px';
}

function scrollToNow() {
  const scr = el('tlScroll');
  if (!scr) return;
  const nx = nowX();
  if (nx >= 0) scr.scrollLeft = Math.max(0, nx - 200);
}

// ═══════════════════ BREAKS ══════════════════════

function renderBreaks() {
  el('breaksSubtitle') && (el('breaksSubtitle').textContent = formatDisplayDate(S.date));

  const depts = getUnique(S.data, 'dept');
  const svs   = getUnique(S.data, 'sv');
  populateSelect('brkDeptFilter', depts);
  populateSelect('brkSVFilter', svs);

  const dept  = (el('brkDeptFilter')||{}).value || '';
  const sv    = (el('brkSVFilter')||{}).value || '';

  let filtered = filterData(S.data, { dept, sv });
  filtered = filtered.filter(e => {
    const sc = getScheduleOn(e);
    return (sc.status === STATUS.WORK || sc.status === STATUS.CHANGED) && sc.breaks;
  });

  const TL_W = TL_TOTAL * TL_PX_MIN;

  function segStyle(tStr, endStr, color, opacity=1) {
    const x = tStrToX(tStr);
    const w = tDurPx(tStr, endStr);
    return `left:${x}px;width:${w}px;background:${color};opacity:${opacity};`;
  }

  const rowsHTML = filtered.map(e => {
    const sc = getScheduleOn(e);
    const col = e.color;
    const initials = e.name.split(' ').slice(0,2).map(w=>w[0]).join('');

    const brk = sc.breaks || [];
    const breakSegs = brk.map(b => {
      const c = b.type === 'lunch' ? 'var(--c-lunch)' : 'var(--c-break)';
      return `<div class="brk-segment" style="${segStyle(b.start, b.end, c)}" title="${b.type==='lunch'?'Обед':'Перерыв'}: ${b.start}–${b.end}"></div>`;
    }).join('');

    const bgW = tDurPx(sc.shiftStart, sc.shiftEnd);
    const bgX = tStrToX(sc.shiftStart);

    return `
      <div class="brk-row">
        <div class="brk-emp-info">
          <div class="brk-emp-name">${e.name.split(' ')[0]} ${(e.name.split(' ')[1]||'').charAt(0)}.</div>
          <div class="brk-emp-sv">СВ: ${e.sv.split(' ')[0]}</div>
        </div>
        <div class="brk-track" style="width:${TL_W}px;">
          <div class="brk-bg-bar" style="left:${bgX}px;width:${bgW}px;"></div>
          ${breakSegs}
        </div>
      </div>
    `;
  }).join('');

  // Time axis
  const axisHTML = [];
  for (let h = 6; h <= 23; h++) {
    const x = tMinToX(h*60);
    axisHTML.push(`<span class="brk-time-label" style="left:${x}px;">${String(h).padStart(2,'0')}:00</span>`);
  }

  setHTML('breaksContent', `
    <div class="card">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <span class="card-title">График перерывов</span>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span style="display:flex;align-items:center;gap:4px;font-size:.8rem;">
              <span style="width:14px;height:8px;border-radius:3px;background:var(--c-break);display:inline-block;"></span> Перерыв (15 мин)
            </span>
            <span style="display:flex;align-items:center;gap:4px;font-size:.8rem;">
              <span style="width:14px;height:8px;border-radius:3px;background:var(--c-lunch);display:inline-block;"></span> Обед (60 мин)
            </span>
          </div>
        </div>
      </div>
      <div class="card-body" style="overflow-x:auto;">
        <div style="min-width:${TL_TOTAL*TL_PX_MIN+200}px;position:relative;">
          <div style="display:flex;align-items:center;margin-bottom:4px;">
            <div style="width:180px;min-width:180px;"></div>
            <div style="position:relative;height:20px;flex:1;">
              ${axisHTML.join('')}
            </div>
          </div>
          ${rowsHTML || '<div class="empty-state"><div class="empty-state-text">Нет рабочих смен за этот день</div></div>'}
        </div>
      </div>
    </div>
  `);
}

// ═══════════════════ CALENDAR ════════════════════

function renderCalendar() {
  if (!S.calYear) {
    S.calYear  = S.date.getFullYear();
    S.calMonth = S.date.getMonth();
  }

  const emps = S.data;
  populateSelect('calEmpFilter', emps.map(e => e.name));
  populateSelect('calDeptFilter', getUnique(emps, 'dept'));

  const selEmpName = (el('calEmpFilter')||{}).value || '';
  const selDept    = (el('calDeptFilter')||{}).value || '';
  let displayEmps  = emps;
  if (selEmpName) displayEmps = emps.filter(e => e.name === selEmpName);
  else if (selDept) displayEmps = emps.filter(e => e.dept === selDept);

  const y = S.calYear, m = S.calMonth;
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const prevMonthDays = new Date(y, m, 0).getDate();

  // Calendar header
  const calNav = `
    <div class="cal-nav">
      <button class="btn btn-ghost" onclick="calPrev()">‹ Пред.</button>
      <h2>${MONTHS_RU[m]} ${y}</h2>
      <button class="btn btn-ghost" onclick="calNext()">След. ›</button>
    </div>
  `;

  const dayHeaders = DAYS_RU.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  // Build cells
  const cells = [];
  const startOffset = (firstDay + 6) % 7; // Mon-first
  for (let i = 0; i < startOffset; i++) {
    const d = prevMonthDays - startOffset + i + 1;
    cells.push({ day: d, month: m-1, year: y, other: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: m, year: y, other: false });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, month: m+1, year: y, other: true });
  }

  const today = new Date();

  const cellsHTML = cells.map(c => {
    const cellDate = new Date(c.year, c.month, c.day);
    const dk = dateKey(cellDate);
    const isT = isToday(cellDate);
    const isSel = sameDay(cellDate, S.date);

    // Collect statuses for this day
    const events = displayEmps.slice(0, 4).map(e => {
      const sc = e.schedule[dk];
      if (!sc || sc.status === STATUS.OFF) return null;
      return { label: STATUS_LABEL[sc.status] || sc.status, color: STATUS_COLOR[sc.status] || '#94a3b8' };
    }).filter(Boolean).slice(0,3);

    const evHTML = events.map(ev =>
      `<div class="cal-event" style="background:${ev.color}20;color:${ev.color};">${ev.label}</div>`
    ).join('');

    return `
      <div class="cal-day${c.other?' other-month':''}${isT?' today':''}${isSel&&!isT?' selected':''}"
        onclick="calDayClick(${c.year},${c.month},${c.day})">
        <div class="cal-day-num">${c.day}</div>
        <div class="cal-day-events">${evHTML}</div>
      </div>
    `;
  }).join('');

  // Employee month summary (if one selected)
  let summaryHTML = '';
  if (selEmpName) {
    const emp = emps.find(e => e.name === selEmpName);
    if (emp) {
      const counts = { work:0, night:0, vacation:0, sick:0, off:0, other:0 };
      for (let d = 1; d <= daysInMonth; d++) {
        const dk2 = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const sc = emp.schedule[dk2] || { status: STATUS.OFF };
        if (sc.status === STATUS.WORK) counts.work++;
        else if (sc.status === STATUS.NIGHT) counts.night++;
        else if (sc.status === STATUS.VACATION) counts.vacation++;
        else if (sc.status === STATUS.SICK) counts.sick++;
        else if (sc.status === STATUS.OFF) counts.off++;
        else counts.other++;
      }
      summaryHTML = `
        <div class="card mt-16">
          <div class="card-header"><span class="card-title">Итоги месяца: ${emp.name}</span></div>
          <div class="card-body">
            <div class="stats-grid">
              <div class="stat-card"><div class="stat-card-label">Рабочих дней</div><div class="stat-card-value" style="color:var(--c-work);">${counts.work}</div></div>
              <div class="stat-card"><div class="stat-card-label">Ночных смен</div><div class="stat-card-value" style="color:var(--c-night);">${counts.night}</div></div>
              <div class="stat-card"><div class="stat-card-label">Отпуск</div><div class="stat-card-value" style="color:var(--c-vacation);">${counts.vacation}</div></div>
              <div class="stat-card"><div class="stat-card-label">Больничный</div><div class="stat-card-value" style="color:var(--c-sick);">${counts.sick}</div></div>
            </div>
          </div>
        </div>
      `;
    }
  }

  setHTML('calendarContent', `
    ${calNav}
    <div class="card">
      <div class="card-body">
        <div class="cal-grid">
          ${dayHeaders}
          ${cellsHTML}
        </div>
      </div>
    </div>
    ${summaryHTML}
  `);
}

function calPrev() {
  S.calMonth--;
  if (S.calMonth < 0) { S.calMonth = 11; S.calYear--; }
  renderCalendar();
}
function calNext() {
  S.calMonth++;
  if (S.calMonth > 11) { S.calMonth = 0; S.calYear++; }
  renderCalendar();
}
function calDayClick(y, m, d) {
  S.date = new Date(y, m, d);
  updateDateDisplay();
  navigate('timeline');
}

// ═══════════════════ EMPLOYEES ═══════════════════

function renderEmployees() {
  const depts = getUnique(S.data, 'dept');
  const svs   = getUnique(S.data, 'sv');
  populateSelect('empDeptFilter', depts);
  populateSelect('empSVFilter',   svs);

  filterEmployees();
}

function filterEmployees() {
  const dept   = (el('empDeptFilter')||{}).value   || '';
  const sv     = (el('empSVFilter')||{}).value     || '';
  const shift  = (el('empShiftFilter')||{}).value  || '';
  const status = (el('empStatusFilter')||{}).value || '';
  const search = (el('empSearch')||{}).value       || '';

  let data = filterData(S.data, { dept, sv, shift, status, search });

  // Sort
  data.sort((a, b) => {
    let va = a[S.sortCol] || '';
    let vb = b[S.sortCol] || '';
    if (S.sortCol === 'status') {
      va = (getScheduleOn(a).status || '');
      vb = (getScheduleOn(b).status || '');
    }
    const cmp = va.localeCompare(vb, 'ru');
    return S.sortDir === 'asc' ? cmp : -cmp;
  });

  el('empSubtitle') && (el('empSubtitle').textContent = `${data.length} сотрудников`);

  const dk = dateKey(S.date);

  const rows = data.map(e => {
    const sc = getScheduleOn(e);
    const isFav = S.favorites.includes(e.id);
    return `
      <tr onclick="navigate('employee',{id:'${e.id}'})">
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            ${avatarSvg(e.name, e.color)}
            <span style="font-weight:600;font-size:.88rem;">${e.name}</span>
          </div>
        </td>
        <td>${e.dept}</td>
        <td>${e.pos}</td>
        <td>${e.sv}</td>
        <td><span class="chip">Смена ${e.shift}</span></td>
        <td>${badge(sc.status)}</td>
        <td>${sc.shiftStart ? `${sc.shiftStart}–${sc.shiftEnd}` : '—'}</td>
        <td>
          <span class="fav-star" style="color:${isFav?'#f59e0b':'var(--border)'};"
            onclick="event.stopPropagation();toggleFav('${e.id}')">★</span>
        </td>
      </tr>
    `;
  }).join('');

  function thSort(col, label) {
    const cls = S.sortCol === col ? ` class="sort-${S.sortDir}"` : '';
    return `<th${cls} onclick="sortEmployees('${col}')">${label}</th>`;
  }

  setHTML('empContent', `
    <div class="emp-table-wrap">
      <table class="emp-table">
        <thead>
          <tr>
            ${thSort('name',  'ФИО')}
            ${thSort('dept',  'Отдел')}
            ${thSort('pos',   'Должность')}
            ${thSort('sv',    'Супервайзер')}
            ${thSort('shift', 'Смена')}
            ${thSort('status','Статус')}
            <th>Время</th>
            <th>★</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--txt-3);">Ничего не найдено</td></tr>'}
        </tbody>
      </table>
    </div>
  `);
}

function sortEmployees(col) {
  if (S.sortCol === col) S.sortDir = S.sortDir === 'asc' ? 'desc' : 'asc';
  else { S.sortCol = col; S.sortDir = 'asc'; }
  filterEmployees();
}

function toggleFav(id) {
  if (S.favorites.includes(id)) {
    S.favorites = S.favorites.filter(f => f !== id);
  } else {
    S.favorites.push(id);
  }
  savePrefs();
  filterEmployees();
}

// ═══════════════════ FAVORITES ═══════════════════

function renderFavorites() {
  const favs = S.data.filter(e => S.favorites.includes(e.id));
  if (!favs.length) {
    setHTML('favContent', `
      <div class="empty-state">
        <div class="empty-state-icon">★</div>
        <div class="empty-state-text">Нет избранных сотрудников</div>
        <div class="empty-state-sub">Добавьте сотрудников в избранное из таблицы</div>
      </div>
    `);
    return;
  }

  setHTML('favContent', `
    <div class="stats-grid">
      ${favs.map(e => {
        const sc = getScheduleOn(e);
        return `
          <div class="card hover-card" style="cursor:pointer;" onclick="navigate('employee',{id:'${e.id}'})">
            <div class="card-body" style="display:flex;align-items:center;gap:12px;">
              ${makeAvatar(e.name, e.color, 44)}
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.92rem;" class="text-truncate">${e.name}</div>
                <div style="font-size:.78rem;color:var(--txt-3);">${e.dept}</div>
                <div style="margin-top:4px;">${badge(sc.status)}</div>
              </div>
              <span class="fav-star" style="color:#f59e0b;" onclick="event.stopPropagation();toggleFav('${e.id}');renderFavorites();">★</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `);
}

// ═══════════════════ PROFILE ═════════════════════

function renderProfile(empId) {
  const emp = S.data.find(e => e.id === empId);
  if (!emp) {
    setHTML('profileContent', '<div class="empty-state"><div class="empty-state-text">Сотрудник не найден</div></div>');
    return;
  }

  // Week: Mon to Sun of current week
  const today = S.date;
  const dow = today.getDay();
  const mondayOffset = (dow + 6) % 7;
  const weekDays = Array.from({length: 7}, (_,i) => addDays(today, i - mondayOffset));

  const weekCardsHTML = weekDays.map(d => {
    const sc = emp.schedule[dateKey(d)] || { status: STATUS.OFF };
    const isT = isToday(d);
    const col = STATUS_COLOR[sc.status] || '#94a3b8';
    return `
      <div class="profile-day-card${isT?' today':''}" onclick="S.date=new Date(${d.getTime()});updateDateDisplay();navigate('employee',{id:'${emp.id}'})">
        <div class="profile-day-name">${DAYS_RU[d.getDay()]}</div>
        <div class="profile-day-num">${d.getDate()}</div>
        <div class="profile-day-status" style="color:${col};">${STATUS_LABEL[sc.status] || '—'}</div>
        ${sc.shiftStart ? `<div style="font-size:.7rem;color:var(--txt-3);margin-top:2px;">${sc.shiftStart}–${sc.shiftEnd}</div>` : ''}
      </div>
    `;
  }).join('');

  const sc = getScheduleOn(emp);
  const isWorking = sc.status === STATUS.WORK || sc.status === STATUS.NIGHT || sc.status === STATUS.CHANGED;
  const isFav = S.favorites.includes(emp.id);

  // Month stats
  const mKey = `${S.date.getFullYear()}-${String(S.date.getMonth()+1).padStart(2,'0')}`;
  let workDays = 0, offDays = 0, sickDays = 0, vacDays = 0;
  Object.entries(emp.schedule).forEach(([k, v]) => {
    if (!k.startsWith(mKey)) return;
    if (v.status === STATUS.WORK || v.status === STATUS.NIGHT || v.status === STATUS.CHANGED) workDays++;
    else if (v.status === STATUS.SICK) sickDays++;
    else if (v.status === STATUS.VACATION) vacDays++;
    else offDays++;
  });

  const breaksHTML = isWorking && sc.breaks ? `
    <div class="card">
      <div class="card-header"><span class="card-title">☕ Перерывы сегодня</span></div>
      <div class="card-body">
        ${sc.breaks.map(b => `
          <div class="modal-info-row">
            <span class="modal-info-label">${b.type==='lunch'?'🍽 Обед':'☕ Перерыв'}</span>
            <span class="modal-info-value">${b.start} – ${b.end}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  setHTML('profileContent', `
    <div>
      <div style="margin-bottom:16px;">
        <button class="btn btn-ghost" onclick="history.back()">← Назад</button>
      </div>

      <div class="profile-header">
        ${makeAvatar(emp.name, emp.color, 72)}
        <div style="flex:1;">
          <div class="profile-name">${emp.name}</div>
          <div class="profile-meta">${emp.pos} · ${emp.dept}</div>
          <div class="profile-meta" style="margin-top:2px;">Смена ${emp.shift} · СВ: ${emp.sv}</div>
          <div style="margin-top:10px;display:flex;align-items:center;gap:10px;">
            ${badge(sc.status)}
            ${isWorking ? `<span style="font-size:.85rem;color:var(--txt-3);">${sc.shiftStart}–${sc.shiftEnd}</span>` : ''}
            <button class="btn btn-sm btn-ghost" onclick="toggleFav('${emp.id}');renderProfile('${emp.id}')" style="color:${isFav?'#f59e0b':'var(--txt-3)'};">
              ${isFav?'★ В избранном':'☆ В избранное'}
            </button>
          </div>
        </div>
      </div>

      <div class="card mb-16" style="margin-bottom:16px;">
        <div class="card-header"><span class="card-title">📅 График на неделю</span></div>
        <div class="card-body">
          <div class="profile-week">${weekCardsHTML}</div>
        </div>
      </div>

      <div class="profile-grid">
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${breaksHTML}

          <div class="card">
            <div class="card-header"><span class="card-title">📊 Итоги месяца</span></div>
            <div class="card-body">
              <div class="stats-grid" style="grid-template-columns:repeat(2,1fr);">
                <div class="stat-card"><div class="stat-card-label">Рабочих дней</div><div class="stat-card-value" style="color:var(--c-work);font-size:1.4rem;">${workDays}</div></div>
                <div class="stat-card"><div class="stat-card-label">Выходных</div><div class="stat-card-value" style="color:var(--txt-3);font-size:1.4rem;">${offDays}</div></div>
                <div class="stat-card"><div class="stat-card-label">Больничный</div><div class="stat-card-value" style="color:var(--c-sick);font-size:1.4rem;">${sickDays}</div></div>
                <div class="stat-card"><div class="stat-card-label">Отпуск</div><div class="stat-card-value" style="color:var(--c-vacation);font-size:1.4rem;">${vacDays}</div></div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="card">
            <div class="card-header"><span class="card-title">ℹ️ Информация</span></div>
            <div class="card-body">
              <div class="modal-info-row"><span class="modal-info-label">ФИО</span><span class="modal-info-value">${emp.name}</span></div>
              <div class="modal-info-row"><span class="modal-info-label">Должность</span><span class="modal-info-value">${emp.pos}</span></div>
              <div class="modal-info-row"><span class="modal-info-label">Отдел</span><span class="modal-info-value">${emp.dept}</span></div>
              <div class="modal-info-row"><span class="modal-info-label">Супервайзер</span><span class="modal-info-value">${emp.sv}</span></div>
              <div class="modal-info-row"><span class="modal-info-label">Смена</span><span class="modal-info-value">Смена ${emp.shift}</span></div>
              <div class="modal-info-row"><span class="modal-info-label">Статус сегодня</span><span class="modal-info-value">${badge(sc.status)}</span></div>
              ${isWorking ? `<div class="modal-info-row"><span class="modal-info-label">Время смены</span><span class="modal-info-value">${sc.shiftStart}–${sc.shiftEnd}</span></div>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `);
}

// ═══════════════════ EMPLOYEE MODAL ══════════════

function showEmpModal(empId) {
  const emp = S.data.find(e => e.id === empId);
  if (!emp) return;
  const sc = getScheduleOn(emp);
  const isWorking = sc.status === STATUS.WORK || sc.status === STATUS.NIGHT || sc.status === STATUS.CHANGED;

  const breaksRows = (isWorking && sc.breaks) ? sc.breaks.map(b => `
    <div class="modal-info-row">
      <span class="modal-info-label">${b.type==='lunch'?'🍽 Обед':'☕ Перерыв'}</span>
      <span class="modal-info-value">${b.start}–${b.end}</span>
    </div>
  `).join('') : '<div class="modal-info-row"><span class="modal-info-label">Нет перерывов</span></div>';

  openModal(emp.name, `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      ${makeAvatar(emp.name, emp.color, 52)}
      <div>
        <div style="font-size:.9rem;font-weight:600;">${emp.pos}</div>
        <div style="font-size:.82rem;color:var(--txt-3);">${emp.dept} · Смена ${emp.shift}</div>
        <div style="margin-top:6px;">${badge(sc.status)}</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Смена</div>
      <div class="modal-info-row"><span class="modal-info-label">Статус</span><span class="modal-info-value">${STATUS_LABEL[sc.status]||'—'}</span></div>
      ${isWorking ? `<div class="modal-info-row"><span class="modal-info-label">Время</span><span class="modal-info-value">${sc.shiftStart}–${sc.shiftEnd}</span></div>` : ''}
      <div class="modal-info-row"><span class="modal-info-label">Супервайзер</span><span class="modal-info-value">${emp.sv}</span></div>
    </div>

    ${isWorking ? `
    <div class="modal-section">
      <div class="modal-section-title">Перерывы</div>
      ${breaksRows}
    </div>
    ` : ''}

    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn btn-primary" onclick="closeModal();navigate('employee',{id:'${emp.id}'})">Профиль</button>
      <button class="btn btn-outline" onclick="closeModal()">Закрыть</button>
    </div>
  `);
}

// ═══════════════════ IMPORT ══════════════════════

function renderImport() {
  setHTML('importContent', `
    <div class="drop-zone" id="dropZone" onclick="el('fileInput').click()">
      <div class="drop-icon">📥</div>
      <div class="drop-title">Перетащите Excel-файл сюда</div>
      <div class="drop-sub">или нажмите для выбора файла</div>
      <button class="btn btn-primary">Выбрать файл (.xlsx)</button>
      <div class="drop-note">
        ${window.XLSX_AVAILABLE
          ? '✅ SheetJS загружен — импорт Excel доступен'
          : '⚠️ SheetJS не загружен. Откройте с интернетом или скачайте xlsx.full.min.js в папку lib/'}
      </div>
    </div>
    <input type="file" id="fileInput" accept=".xlsx,.xls,.csv,.json" onchange="handleFileInput(this)" />

    <div class="import-grid">
      <div class="import-card">
        <h3>📋 Формат импорта расписания</h3>
        <p>Excel-файл должен содержать листы с расписанием.</p>
        <p>Ожидаемые колонки: ФИО, Смена, Супервайзер, Дата, Статус, Начало, Конец</p>
        <button class="btn btn-outline" onclick="downloadTemplate()">⬇️ Скачать шаблон</button>
      </div>

      <div class="import-card">
        <h3>📄 Импорт JSON</h3>
        <p>Вы можете загрузить ранее экспортированные данные в формате JSON.</p>
        <button class="btn btn-outline" onclick="el('fileInput').click()">Загрузить JSON</button>
      </div>

      <div class="import-card">
        <h3>🔄 Сброс данных</h3>
        <p>Вернуть демо-данные, сбросив все изменения.</p>
        <button class="btn btn-danger" onclick="resetToMock()">Сбросить к демо-данным</button>
      </div>

      <div class="import-card">
        <h3>💾 Текущие данные</h3>
        <p>Сотрудников в системе: <strong>${S.data.length}</strong></p>
        <p>Дата последнего обновления: <strong>${new Date().toLocaleDateString('ru-RU')}</strong></p>
        <button class="btn btn-outline" onclick="exportJSON()">💾 Сохранить JSON</button>
      </div>
    </div>

    <div id="importPreview" style="margin-top:24px;"></div>
  `);

  // Drag & drop
  const dz = el('dropZone');
  if (dz) {
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    });
  }
}

function handleFileInput(input) {
  const file = input.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'json') {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          S.data = data;
          saveData(S.data);
          toast('✅ JSON импортирован успешно', 'success');
          showImportPreview(data);
        } else { toast('❌ Неверный формат JSON', 'error'); }
      } catch { toast('❌ Ошибка чтения JSON', 'error'); }
    };
    reader.readAsText(file);
    return;
  }

  if ((ext === 'xlsx' || ext === 'xls') && window.XLSX_AVAILABLE) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const parsed = parseExcelWorkbook(wb);
        if (parsed.length) {
          S.data = parsed;
          saveData(S.data);
          toast(`✅ Импортировано ${parsed.length} сотрудников`, 'success');
          showImportPreview(parsed);
        } else {
          toast('⚠️ Данные не найдены в файле', 'warning');
          showExcelRaw(wb);
        }
      } catch(err) {
        toast('❌ Ошибка чтения Excel: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  if ((ext === 'xlsx' || ext === 'xls') && !window.XLSX_AVAILABLE) {
    toast('⚠️ Библиотека SheetJS не загружена. Нужен интернет.', 'warning');
    return;
  }

  toast('⚠️ Неподдерживаемый формат файла', 'warning');
}

function parseExcelWorkbook(wb) {
  const results = [];
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
    if (!rows.length) return;

    const headers = (rows[0] || []).map(h => String(h||'').trim().toLowerCase());
    const nameIdx  = headers.findIndex(h => h.includes('фио') || h.includes('имя') || h.includes('name'));
    const svIdx    = headers.findIndex(h => h.includes('св') || h.includes('супервайзер'));
    const shiftIdx = headers.findIndex(h => h.includes('смена') || h.includes('shift'));
    const deptIdx  = headers.findIndex(h => h.includes('отдел') || h.includes('dept'));
    const posIdx   = headers.findIndex(h => h.includes('должн') || h.includes('pos'));

    if (nameIdx < 0) return;

    rows.slice(1).forEach((row, ri) => {
      const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';
      if (!name) return;
      const existing = results.find(e => e.name === name);
      if (existing) return; // skip duplicates

      const emp = {
        id:    `xlsx-${ri}-${Date.now()}`,
        name,
        dept:  deptIdx >= 0  ? String(row[deptIdx]||'').trim()  : 'Не указан',
        sv:    svIdx >= 0    ? String(row[svIdx]||'').trim()    : 'Не указан',
        shift: shiftIdx >= 0 ? String(row[shiftIdx]||'').trim() : '1',
        pos:   posIdx >= 0   ? String(row[posIdx]||'').trim()   : 'Сотрудник',
        color: COLORS_POOL[results.length % COLORS_POOL.length],
        schedule: generateSchedule({ id:`xlsx-${ri}`, shift: shiftIdx>=0?String(row[shiftIdx]||'1'):'1' }),
      };
      results.push(emp);
    });
  });
  return results;
}

function showExcelRaw(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }).slice(0, 10);
  const preview = el('importPreview');
  if (!preview) return;
  preview.innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">Предпросмотр Excel (первые 10 строк)</span></div>
      <div class="card-body" style="overflow-x:auto;">
        <table class="emp-table">
          ${rows.map((r,i) => `<tr>${r.map(c=>`<td>${c||''}</td>`).join('')}</tr>`).join('')}
        </table>
      </div>
    </div>
  `;
}

function showImportPreview(data) {
  const preview = el('importPreview');
  if (!preview) return;
  preview.innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">✅ Импортировано: ${data.length} сотрудников</span></div>
      <div class="card-body" style="overflow-x:auto;">
        <table class="emp-table">
          <thead><tr><th>ФИО</th><th>Отдел</th><th>Должность</th><th>СВ</th><th>Смена</th></tr></thead>
          <tbody>
            ${data.slice(0,15).map(e => `
              <tr>
                <td>${e.name}</td>
                <td>${e.dept}</td>
                <td>${e.pos}</td>
                <td>${e.sv}</td>
                <td>Смена ${e.shift}</td>
              </tr>
            `).join('')}
            ${data.length > 15 ? `<tr><td colspan="5" style="text-align:center;color:var(--txt-3);">... ещё ${data.length-15}</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function downloadTemplate() {
  if (!window.XLSX_AVAILABLE) {
    toast('⚠️ SheetJS не загружен', 'warning');
    return;
  }
  const ws_data = [
    ['ФИО', 'Отдел', 'Должность', 'Супервайзер', 'Смена', 'Статус', 'Дата', 'Начало', 'Конец'],
    ['Иванов Иван Иванович', 'Обслуживание клиентов', 'Оператор', 'Александрова Н.В.', '1', 'work', '2026-05-16', '09:00', '18:00'],
    ['Петрова Анна Сергеевна', 'Кредитный отдел', 'Специалист', 'Смирнова Е.П.', '2', 'work', '2026-05-16', '12:00', '21:00'],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'Расписание');
  XLSX.writeFile(wb, 'kaorzip_template.xlsx');
  toast('✅ Шаблон скачан', 'success');
}

function resetToMock() {
  if (!confirm('Сбросить все данные к демо-данным?')) return;
  S.data = buildMockData();
  saveData(S.data);
  toast('✅ Данные сброшены', 'success');
  renderImport();
}

function exportJSON() {
  const json = JSON.stringify(S.data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `kaorzip_data_${dateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ JSON сохранён', 'success');
}

// ═══════════════════ EXPORT ══════════════════════

function renderExport() {
  setHTML('exportContent', `
    <div class="export-grid">
      <div class="export-card hover-card">
        <div class="export-icon">🖼️</div>
        <div class="export-title">Экспорт PNG</div>
        <div class="export-desc">Сохранить текущий Timeline как изображение</div>
        <button class="btn btn-primary w-full" onclick="exportPNG()">
          ${window.H2C_AVAILABLE ? 'Скачать PNG' : '⚠️ html2canvas не загружен'}
        </button>
      </div>

      <div class="export-card hover-card">
        <div class="export-icon">📄</div>
        <div class="export-title">Экспорт PDF</div>
        <div class="export-desc">Печатная версия расписания в PDF</div>
        <button class="btn btn-primary w-full" onclick="exportPDF()">
          ${window.JSPDF_AVAILABLE ? 'Скачать PDF' : '⚠️ jsPDF не загружен'}
        </button>
      </div>

      <div class="export-card hover-card">
        <div class="export-icon">🖨️</div>
        <div class="export-title">Печать</div>
        <div class="export-desc">Отправить расписание на принтер</div>
        <button class="btn btn-outline w-full" onclick="window.print()">Печать</button>
      </div>

      <div class="export-card hover-card">
        <div class="export-icon">💾</div>
        <div class="export-title">Сохранить JSON</div>
        <div class="export-desc">Резервная копия всех данных</div>
        <button class="btn btn-outline w-full" onclick="exportJSON()">Скачать JSON</button>
      </div>

      <div class="export-card hover-card">
        <div class="export-icon">📊</div>
        <div class="export-title">Экспорт Excel</div>
        <div class="export-desc">Экспорт расписания в .xlsx</div>
        <button class="btn btn-outline w-full" onclick="exportExcel()">
          ${window.XLSX_AVAILABLE ? 'Скачать XLSX' : '⚠️ SheetJS не загружен'}
        </button>
      </div>

      <div class="export-card hover-card">
        <div class="export-icon">📱</div>
        <div class="export-title">Текстовый отчёт</div>
        <div class="export-desc">Сводка для Telegram / мессенджеров</div>
        <button class="btn btn-outline w-full" onclick="exportTextReport()">Скопировать текст</button>
      </div>
    </div>

    <div id="exportPreview" style="margin-top:24px;"></div>
  `);
}

async function exportPNG() {
  if (!window.H2C_AVAILABLE) { toast('⚠️ html2canvas не загружен', 'warning'); return; }
  toast('⏳ Генерация PNG…');
  navigate('timeline');
  await new Promise(r => setTimeout(r, 500));
  try {
    const canvas = await html2canvas(el('timelineContent'), { scale: 2, backgroundColor: '#ffffff' });
    const a = document.createElement('a');
    a.download = `timeline_${dateKey(S.date)}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    toast('✅ PNG скачан', 'success');
  } catch(e) { toast('❌ Ошибка: ' + e.message, 'error'); }
}

async function exportPDF() {
  if (!window.JSPDF_AVAILABLE) { toast('⚠️ jsPDF не загружен', 'warning'); return; }
  if (!window.H2C_AVAILABLE)   { toast('⚠️ html2canvas не загружен', 'warning'); return; }
  toast('⏳ Генерация PDF…');
  navigate('timeline');
  await new Promise(r => setTimeout(r, 500));
  try {
    const canvas = await html2canvas(el('timelineContent'), { scale: 1.5, backgroundColor: '#ffffff' });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save(`kaorzip_schedule_${dateKey(S.date)}.pdf`);
    toast('✅ PDF скачан', 'success');
  } catch(e) { toast('❌ Ошибка: ' + e.message, 'error'); }
}

function exportExcel() {
  if (!window.XLSX_AVAILABLE) { toast('⚠️ SheetJS не загружен', 'warning'); return; }
  const dk = dateKey(S.date);
  const rows = [['ФИО','Отдел','Должность','Супервайзер','Смена','Статус','Начало','Конец']];
  S.data.forEach(e => {
    const sc = e.schedule[dk] || { status: STATUS.OFF };
    rows.push([e.name, e.dept, e.pos, e.sv, e.shift, STATUS_LABEL[sc.status]||'—', sc.shiftStart||'', sc.shiftEnd||'']);
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, `График ${dk}`);
  XLSX.writeFile(wb, `kaorzip_${dk}.xlsx`);
  toast('✅ Excel скачан', 'success');
}

function exportTextReport() {
  const dk = dateKey(S.date);
  const lines = [`📅 График на ${formatDisplayDate(S.date)}`, ''];
  DEPARTMENTS.forEach(dept => {
    const emps = S.data.filter(e => e.dept === dept);
    lines.push(`📂 ${dept}:`);
    emps.forEach(e => {
      const sc = e.schedule[dk] || { status: STATUS.OFF };
      const timeStr = sc.shiftStart ? ` (${sc.shiftStart}–${sc.shiftEnd})` : '';
      lines.push(`  • ${e.name} — ${STATUS_LABEL[sc.status]||'—'}${timeStr}`);
    });
    lines.push('');
  });
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    toast('✅ Текст скопирован в буфер', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = lines.join('\n');
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('✅ Текст скопирован', 'success');
  });
}

// ═══════════════════ GLOBAL SEARCH ════════════════

function initSearch() {
  const input = el('globalSearch');
  const drop  = el('searchDropdown');
  if (!input || !drop) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { drop.classList.remove('open'); return; }

    const matches = S.data.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.dept.toLowerCase().includes(q) ||
      e.sv.toLowerCase().includes(q)
    ).slice(0, 8);

    if (!matches.length) {
      drop.innerHTML = '<div class="search-no-results">Ничего не найдено</div>';
    } else {
      drop.innerHTML = matches.map(e => {
        const sc = getScheduleOn(e);
        return `
          <div class="search-result-item" onclick="input.value='';drop.classList.remove('open');navigate('employee',{id:'${e.id}'})">
            <div class="search-result-avatar" style="background:${e.color}20;color:${e.color};">
              ${e.name.split(' ').slice(0,2).map(w=>w[0]).join('')}
            </div>
            <div class="search-result-info">
              <div class="search-result-name">${e.name}</div>
              <div class="search-result-meta">${e.dept} · ${badge(sc.status)}</div>
            </div>
          </div>
        `;
      }).join('');
    }
    drop.classList.add('open');
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !drop.contains(e.target)) {
      drop.classList.remove('open');
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { drop.classList.remove('open'); input.value = ''; }
  });
}

// ═══════════════════ DATE NAVIGATION ═════════════

function updateDateDisplay() {
  const d = S.date;
  const label = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
  const dateBtn = el('dateDisplay');
  if (dateBtn) dateBtn.textContent = label;
}

function initDateNav() {
  el('prevDateBtn') && el('prevDateBtn').addEventListener('click', () => {
    S.date = addDays(S.date, -1);
    updateDateDisplay();
    renderCurrentPage();
  });
  el('nextDateBtn') && el('nextDateBtn').addEventListener('click', () => {
    S.date = addDays(S.date, 1);
    updateDateDisplay();
    renderCurrentPage();
  });
  el('todayBtn') && el('todayBtn').addEventListener('click', () => {
    S.date = new Date();
    updateDateDisplay();
    renderCurrentPage();
  });
}

function renderCurrentPage() {
  navigate(S.page);
}

// ═══════════════════ SIDEBAR ═════════════════════

function initSidebar() {
  const ham     = el('hamburger');
  const close   = el('sidebarClose');
  const overlay = el('sidebarOverlay');
  const sidebar = el('sidebar');

  function open()  { sidebar.classList.add('open'); overlay.classList.add('open'); }
  function close_()  { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

  ham     && ham.addEventListener('click', open);
  close   && close.addEventListener('click', close_);
  overlay && overlay.addEventListener('click', close_);

  // Nav links
  qsa('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page) navigate(page);
      if (window.innerWidth < 768) close_();
    });
  });
}

// ═══════════════════ THEME ═══════════════════════

function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.theme);
  const btn = el('themeBtn');
  if (btn) btn.textContent = S.theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  S.theme = S.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  savePrefs();
}

function toggleCompact() {
  S.compact = !S.compact;
  document.body.classList.toggle('compact', S.compact);
  const btn = el('compactBtn');
  if (btn) btn.classList.toggle('active', S.compact);
  savePrefs();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ═══════════════════ LEGEND ══════════════════════

function initLegend() {
  const list = el('legendList');
  if (list) {
    list.innerHTML = LEGEND_ITEMS.map(item => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${item.color};"></div>
        <span class="legend-label">${item.label}</span>
      </div>
    `).join('');
  }
  el('legendToggle') && el('legendToggle').addEventListener('click', () => {
    el('legendPanel').classList.toggle('hidden');
  });
}

// ═══════════════════ INIT ════════════════════════

function init() {
  // Load prefs
  loadPrefs();
  applyTheme();
  if (S.compact) { document.body.classList.add('compact'); el('compactBtn') && el('compactBtn').classList.add('active'); }

  // Load data
  const saved = loadData();
  S.data = (saved && saved.length) ? saved : buildMockData();
  if (!saved || !saved.length) saveData(S.data);

  // Set today
  S.date = new Date();
  S.calYear  = S.date.getFullYear();
  S.calMonth = S.date.getMonth();
  updateDateDisplay();

  // Init modules
  initSidebar();
  initDateNav();
  initSearch();
  initLegend();

  // Theme btn
  el('themeBtn') && el('themeBtn').addEventListener('click', toggleTheme);
  el('compactBtn') && el('compactBtn').addEventListener('click', toggleCompact);
  el('fullscreenBtn') && el('fullscreenBtn').addEventListener('click', toggleFullscreen);

  // Modal close
  el('modalClose') && el('modalClose').addEventListener('click', closeModal);
  el('modalBackdrop') && el('modalBackdrop').addEventListener('click', e => {
    if (e.target === el('modalBackdrop')) closeModal();
  });

  // scroll-to-now btn
  el('scrollNowBtn') && el('scrollNowBtn').addEventListener('click', scrollToNow);

  // Route
  handleHash();
  window.addEventListener('hashchange', handleHash);

  // Auto-refresh now-line every minute
  setInterval(() => {
    if (S.page === 'timeline' && sameDay(S.date, new Date())) renderTimeline();
  }, 60000);

  // Expose navigate globally for inline onclick
  window.navigate = navigate;
  window.S = S;

  console.info('KAORZIP initialized. Employees:', S.data.length);
}

document.addEventListener('DOMContentLoaded', init);
