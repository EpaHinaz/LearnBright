import { state } from './state.js';
import { getAllA, getCustom, getUsers, saveUsers, getSetting } from './storage.js';
import { esc } from './utils.js';
import { SUBJECTS, ALL_TABS, GRADE_OPTIONS, TODAY_ROWS, getSubjectMeta } from './config.js';
import { renderAdminStudents, renderSettings } from './admin.js';
import { renderBuilder , renderCustomList } from './builder.js';

function getSubjectLabel(subject) {
  return getSubjectMeta(subject).label;
}

function getSubjectIcon(subject) {
  return getSubjectMeta(subject).icon;
}

function getUncompletedAssignmentsForSubject(subject, grade) {
  return getAllA().filter(a => a.subject === subject && a.grade === grade && !state.currentUser.completedAssignments?.[a.id]);
}

function getTodayRows() {
  const value = Number(getSetting('today_rows', TODAY_ROWS));
  return Number.isInteger(value) && value > 0 ? value : TODAY_ROWS;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function ensureTodayAssignments(user) {
  const users = getUsers();
  let changed = false;
  const grade = user.grade;
  const rowCount = getTodayRows();
  const currentDate = todayDate();
  const assignmentsBySubject = SUBJECTS.reduce((acc, subject) => {
    acc[subject.id] = getAllA().filter(a => a.subject === subject.id && a.grade === grade);
    return acc;
  }, {});

  if (!user.todayAssignments || typeof user.todayAssignments !== 'object') {
    user.todayAssignments = {};
    changed = true;
  }

  if (user.todayAssignmentsDate !== currentDate || user.todayAssignmentsRows !== rowCount) {
    user.todayAssignments = {};
    user.todayAssignmentsDate = currentDate;
    user.todayAssignmentsRows = rowCount;
    changed = true;
  }

  SUBJECTS.forEach(subject => {
    const allForSubject = assignmentsBySubject[subject.id];
    const uncompleted = allForSubject.filter(a => !user.completedAssignments?.[a.id]);
    const saved = Array.isArray(user.todayAssignments[subject.id]) ? [...user.todayAssignments[subject.id]] : [];
    const validSaved = saved.filter(id => allForSubject.some(a => a.id === id));
    if (validSaved.length !== saved.length) changed = true;

    const used = new Set(validSaved);
    const available = uncompleted.filter(a => !used.has(a.id));
    const fill = available.slice(0, Math.max(0, rowCount - validSaved.length)).map(a => a.id);
    const finalIds = [...validSaved, ...fill].slice(0, rowCount);

    if (!Array.isArray(user.todayAssignments[subject.id]) || user.todayAssignments[subject.id].join(',') !== finalIds.join(',')) {
      user.todayAssignments[subject.id] = finalIds;
      changed = true;
    }
  });

  if (changed) {
    users[user.name] = user;
    saveUsers(users);
  }

  return user.todayAssignments;
}

function buildTodayRow(rowIndex, todayAssignmentsBySubject) {
  return `<div class="today-grid">${SUBJECTS.map(subject => {
    const assignmentId = todayAssignmentsBySubject[subject.id]?.[rowIndex];
    const assignment = assignmentId ? getAllA().find(a => a.id === assignmentId) : null;
    if (!assignment) {
      return `<div class="today-card acard" style="opacity:.65;min-height:120px"><div class="atype">${subject.icon} ${subject.short}</div><div style="font-size:.9rem;color:#6B7280;margin-top:8px">No more uncompleted tests.</div></div>`;
    }
    return `<div class="today-card acard${state.currentUser.completedAssignments?.[assignment.id] ? ' done' : ''}" onclick="startAssignment('${assignment.id}')" style="cursor:pointer;min-height:120px">
      <div class="atype">${subject.icon} ${subject.short}</div>
      <div class="atitle" style="font-size:1rem;margin-top:8px">${esc(assignment.title)}</div>
      <div class="ameta" style="margin-top:10px"><span>📝 ${assignment.questions.length} Qs</span><span>⭐ ${assignment.questions.length * 10} pts</span></div>
    </div>`;
  }).join('')}</div>`;
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

export function showTab(tab) {
  // record current tab for navigation context
  state.currentTab = tab;
  const tabs = document.querySelectorAll('#s-app .ntab');
  tabs.forEach((tabElement, index) => {
    const tabId = ALL_TABS[index];
    tabElement.classList.toggle('active', tabId === tab);
  });
  ALL_TABS.forEach(tabId => {
    const pane = document.getElementById('t-' + tabId);
    if (pane) pane.style.display = tabId === tab ? 'block' : 'none';
  });
  if (tab === 'dash') renderDash();
  if (SUBJECTS.find(s => s.id === tab)) renderList(tab);
  if (tab === 'prog') renderProg();
}

export function showAdminTab(tab) {
  document.querySelectorAll('.admt').forEach((button, index) => {
    const name = ['students', 'daily', 'builder', 'custom', 'settings'][index];
    button.classList.toggle('active', name === tab);
  });
  document.querySelectorAll('.apanel').forEach(panel => panel.classList.remove('active'));
  const target = document.getElementById('ap-' + tab);
  if (target) target.classList.add('active');
  if (tab === 'students') renderAdminStudents();
  if (tab === 'daily' && window.renderDailySummaryTable) window.renderDailySummaryTable();
  if (tab === 'builder') renderBuilder();
  if (tab === 'custom') renderCustomList();
  if (tab === 'settings') renderSettings();
}

export function renderDash() {
  if (!state.currentUser) return;
  const all = getAllA().filter(a => a.grade === state.currentUser.grade);
  const done = Object.keys(state.currentUser.completedAssignments || {}).length;
  const pts = state.currentUser.totalPoints || 0;
  const vals = Object.values(state.currentUser.completedAssignments || {});
  const avg = vals.length ? Math.round(vals.reduce((sum, v) => sum + (v.pct || 0), 0) / vals.length) : 0;

  const subjectCards = SUBJECTS.map(subject => {
    const count = getAllA().filter(a => a.subject === subject.id && a.grade === state.currentUser.grade).length;
    return `<div class="subcard" onclick="showTab('${subject.id}')">
      <div class="sico">${subject.icon}</div>
      <h3>${subject.label}</h3>
      <p>Practice ${subject.label.toLowerCase()} skills for Grade ${state.currentUser.grade}.</p>
      <span class="badge" style="background:${subject.color};color:#fff">Grade ${state.currentUser.grade} · ${count} Assignments</span>
    </div>`;
  }).join('');

  const todayAssignments = ensureTodayAssignments(state.currentUser);
  const rowCount = getTodayRows();
  const todayRows = Array.from({ length: rowCount }).map((_, index) => buildTodayRow(index, todayAssignments)).join('');
  const todayTotal = SUBJECTS.length * rowCount;
  const todayCompleted = SUBJECTS.reduce((sum, subject) => {
    const completedIds = todayAssignments[subject.id]?.filter(id => state.currentUser.completedAssignments?.[id]) || [];
    return sum + completedIds.length;
  }, 0);

  document.getElementById('t-dash').innerHTML = `
    <div class="wbanner"><h2>Hello, ${esc(state.currentUser.name)}! 👋</h2><p>Grade ${state.currentUser.grade} · Keep it up!</p><div class="wstar">⭐</div></div>
    <div class="sgrid">
      <div class="scard"><div class="snum" style="color:var(--sky)">${done}</div><div class="slbl">Completed</div></div>
      <div class="scard"><div class="snum" style="color:var(--sun)">${pts}</div><div class="slbl">Points</div></div>
      <div class="scard"><div class="snum" style="color:var(--mint)">${avg}%</div><div class="slbl">Avg Score</div></div>
      <div class="scard"><div class="snum" style="color:var(--lav)">${all.length - done}</div><div class="slbl">Remaining</div></div>
    </div>
    <div class="shdr" style="margin-top:22px"><h2>📅 Today’s Assigned Tests</h2><p>${todayCompleted}/${todayTotal} of today’s assignments completed.</p></div>
    ${todayRows}
    <div class="subcards">${subjectCards}</div>`;
}

export function renderList(subject) {
  const grade = state.currentFilter || state.currentUser.grade;
  const list = getAllA().filter(a => a.subject === subject && a.grade === grade);
  const customIds = getCustom().map(a => a.id);
  const meta = getSubjectMeta(subject);

  const cards = list.map(a => {
    const rec = state.currentUser.completedAssignments?.[a.id];
    const isCust = customIds.includes(a.id);
    return `<div class="acard ${rec ? 'done' : ''}" onclick="startAssignment('${a.id}')">
      <div class="atype">${meta.icon} ${meta.short} · Gr ${a.grade}${isCust ? '<span class="custom-tag">Custom</span>' : ''}</div>
      <div class="atitle">${esc(a.title)}</div>
      <div style="font-size:.82rem;color:#6B7280;margin-top:3px">${esc(a.description)}</div>
      <div class="ameta"><span>📝 ${a.questions.length} Qs</span><span>⭐ ${a.questions.length * 10} pts</span></div>
      ${rec ? `<div class="sbadge">Last: ${rec.pct}%</div>` : ''}
    </div>`;
  }).join('') || '<div class="empty"><div class="ei">📭</div><p>No assignments for this grade yet.</p></div>';

  document.getElementById('t-' + subject).innerHTML = `
    <div class="shdr"><h2>${meta.icon} ${meta.label}</h2><p>Select an assignment to begin.</p></div>
    <div class="gfilter">${GRADE_OPTIONS.map(g => `<button class="fbtn ${grade === g ? 'active' : ''}" onclick="setFilter('${subject}','${g}')">Grade ${g}</button>`).join('')}</div>
    <div class="agrid">${cards}</div>`;
}

export function setFilter(subject, grade) {
  state.currentFilter = grade;
  renderList(subject);
}

export function renderProg() {
  if (!state.currentUser) return;
  let cards = '';

  SUBJECTS.forEach(subject => {
    GRADE_OPTIONS.forEach(gr => {
      const list = getAllA().filter(a => a.subject === subject.id && a.grade === gr);
      const done = list.filter(a => state.currentUser.completedAssignments?.[a.id]);
      const p = list.length ? Math.round((done.length / list.length) * 100) : 0;
      cards += `<div class="pvc"><h4>${subject.icon} ${subject.short} – Grade ${gr}</h4>
        <div class="pvrow"><span class="pvlbl">${done.length}/${list.length} done</span><span class="pvpct">${p}%</span></div>
        <div class="pvbar"><div class="pvfill" style="width:${p}%;background:${subject.color}"></div></div>
      </div>`;
    });
  });

  const hist = (state.currentUser.history || []).slice(0, 20);
  const histH = hist.length ? hist.map(h => {
    const meta = getSubjectMeta(h.subject);
    const ds = new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const sc = h.pct >= 80 ? 'var(--mint)' : h.pct >= 60 ? 'var(--sun)' : 'var(--coral)';
    return `<div class="hitem">
      <div class="hico" style="background:#F3F4F6">${meta.icon}</div>
      <div class="hinf"><div class="htitle">${esc(h.title)}</div><div class="hdate">${ds}</div></div>
      <div class="hscore" style="color:${sc}">${h.pct}%</div>
    </div>`;
  }).join('') : '<div class="empty" style="padding:20px"><p>No assignments completed yet.</p></div>';

  document.getElementById('t-prog').innerHTML = `
    <div class="shdr"><h2>📊 Your Progress</h2><p>Track your learning journey!</p></div>
    <div class="pov">${cards}</div>
    <div class="hlist"><h3>Recent Activity</h3>${histH}</div>
    ${state.currentUser.email ? `<div style="margin-top:14px;padding:14px;background:#fff;border-radius:13px;font-size:.88rem;color:#6B7280;box-shadow:var(--sh)">📧 Progress reports → <strong>${esc(state.currentUser.email)}</strong></div>` : ''}`;
}
