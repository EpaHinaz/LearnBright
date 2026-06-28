import { state } from './state.js';
import { getUsers, saveUsers, getAllA, getCustom } from './storage.js';
import { esc, toast } from './utils.js';
import { getAdminPass, ADMIN_KEY, CUSTOM_KEY, USERS_KEY } from './storage.js';
import { getSubjectMeta } from './config.js';

export function renderAdminStudents() {
  const users = getUsers();
  const rows = Object.values(users);
  if (!rows.length) {
    document.getElementById('ap-students').innerHTML = '<div class="empty"><div class="ei">👥</div><p>No students yet.</p></div>';
    return;
  }

  const tRows = rows.map(u => {
    const vals = Object.values(u.completedAssignments || {});
    const done = vals.length;
    const avg = done ? Math.round(vals.reduce((s, v) => s + (v.pct || 0), 0) / done) : 0;
    const pts = u.totalPoints || 0;
    const last = u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const bc = avg >= 80 ? 'var(--mint)' : avg >= 60 ? 'var(--sun)' : 'var(--coral)';
    const n = u.name.replace(/'/g, "\\'");
    return `<tr>
      <td><strong>${esc(u.name)}</strong></td>
      <td><span class="pill pg${u.grade}">Gr ${u.grade}</span></td>
      <td>${esc(u.email || '—')}</td>
      <td>${done}</td>
      <td><div class="sbarw"><div class="sbarbg"><div class="sbarfg" style="width:${avg}%;background:${bc}"></div></div><strong>${avg}%</strong></div></td>
      <td><strong style="color:var(--sun)">${pts}</strong></td>
      <td>${last}</td>
      <td><button class="btn-sm" onclick="openStudent('${n}')">View</button> <button class="btn-sm dng" onclick="delStudent('${n}')">Delete</button></td>
    </tr>`;
  }).join('');

  const tot = rows.length;
  const totDone = rows.reduce((sum, u) => sum + Object.keys(u.completedAssignments || {}).length, 0);
  const avgs = rows.map(u => {
    const values = Object.values(u.completedAssignments || {});
    return values.length ? values.reduce((sum, x) => sum + (x.pct || 0), 0) / values.length : null;
  }).filter(x => x !== null);
  const cAvg = avgs.length ? Math.round(avgs.reduce((sum, v) => sum + v, 0) / avgs.length) : 0;

  document.getElementById('ap-students').innerHTML = `
    <div class="admhdr"><div><h2>👥 Student Dashboard</h2><p>${tot} students · ${totDone} assignments done · Class avg ${cAvg}%</p></div></div>
    <div class="sgrid" style="margin-bottom:18px">
      <div class="scard"><div class="snum" style="color:var(--sky)">${tot}</div><div class="slbl">Students</div></div>
      <div class="scard"><div class="snum" style="color:var(--mint)">${totDone}</div><div class="slbl">Done</div></div>
      <div class="scard"><div class="snum" style="color:var(--sun)">${cAvg}%</div><div class="slbl">Class Avg</div></div>
      <div class="scard"><div class="snum" style="color:var(--lav)">${getAllA().length}</div><div class="slbl">Assignments</div></div>
    </div>
    <div class="dtw"><h3>📋 All Students</h3>
      <div style="overflow-x:auto">
      <table><thead><tr><th>Name</th><th>Grade</th><th>Email</th><th>Done</th><th>Avg</th><th>Pts</th><th>Last Login</th><th>Actions</th></tr></thead>
      <tbody>${tRows}</tbody></table></div></div>
    <button class="btn-sm" onclick="exportCSV()" style="padding:9px 18px;font-size:.86rem">📥 Export CSV</button>`;
}

export function openStudent(name) {
  const u = getUsers()[name];
  if (!u) return;
  const done = u.completedAssignments || {};
  const vals = Object.values(done);
  const avg = vals.length ? Math.round(vals.reduce((s, v) => s + (v.pct || 0), 0) / vals.length) : 0;
  let aRows = '';

  getAllA().forEach(a => {
    const rec = done[a.id];
    if (!rec) return;
    const ds = new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const sc = rec.pct >= 80 ? 'var(--mint)' : rec.pct >= 60 ? 'var(--sun)' : 'var(--coral)';
    const qRows = rec.answers?.length ? rec.answers.map((ans, i) =>
      `<div class="arow">
        <span class="aidx">Q${i + 1}</span>
        <span class="aqt">${esc(ans.questionText || '')}</span>
        <span class="aval" style="color:${ans.correct ? 'var(--mint)' : 'var(--coral)'}">
          ${ans.correct ? '✓ Correct' : '✗ ' + esc(ans.userAnswer || '—')}
        </span>
      </div>`
    ).join('') : '';

    const meta = getSubjectMeta(a.subject);
    aRows += `<div style="border:1px solid var(--border);border-radius:11px;padding:13px;margin-bottom:11px">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-bottom:9px">
        <span>${meta.icon}</span>
        <strong>${esc(a.title)}</strong>
        <span class="pill ${a.subject}">${meta.short}</span>
        <span class="pill pg${a.grade}">Gr ${a.grade}</span>
        <span style="margin-left:auto;font-weight:900;color:${sc}">${rec.pct}%</span>
        <span style="font-size:.79rem;color:#6B7280">· ${ds}</span>
      </div>
      ${qRows || '<p style="font-size:.82rem;color:#6B7280">No detail saved.</p>'}
    </div>`;
  });

  document.getElementById('stmodal-body').innerHTML = `
    <h3>👤 ${esc(u.name)} <button class="mcls" onclick="closeModal()">✕</button></h3>
    <div style="display:flex;gap:13px;flex-wrap:wrap;margin-bottom:18px">
      <div class="scard" style="min-width:90px;padding:12px"><div class="snum" style="color:var(--sky);font-size:1.4rem">${vals.length}</div><div class="slbl">Done</div></div>
      <div class="scard" style="min-width:90px;padding:12px"><div class="snum" style="color:var(--sun);font-size:1.4rem">${avg}%</div><div class="slbl">Avg</div></div>
      <div class="scard" style="min-width:90px;padding:12px"><div class="snum" style="color:var(--mint);font-size:1.4rem">${u.totalPoints || 0}</div><div class="slbl">Points</div></div>
    </div>
    <div style="font-size:.85rem;color:#6B7280;margin-bottom:16px">
      Grade ${u.grade} · ${esc(u.email || 'No email')} · Last login: ${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}
    </div>
    <h4 style="font-weight:800;margin-bottom:11px">Assignment Answers</h4>
    ${aRows || '<div class="empty" style="padding:14px"><p>No assignments completed yet.</p></div>'}`;
  document.getElementById('stmodal').classList.add('open');
}

export function closeModal() {
  document.getElementById('stmodal').classList.remove('open');
}

export function delStudent(name) {
  if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return;
  const users = getUsers();
  delete users[name];
  saveUsers(users);
  renderAdminStudents();
  toast(`"${name}" deleted.`);
}

export function exportCSV() {
  let csv = 'Name,Grade,Email,Done,Avg Score,Points,Last Login\n';
  Object.values(getUsers()).forEach(u => {
    const vals = Object.values(u.completedAssignments || {});
    const avg = vals.length ? Math.round(vals.reduce((sum, v) => sum + (v.pct || 0), 0) / vals.length) : 0;
    csv += `"${u.name}",${u.grade},"${u.email || ''}",${vals.length},${avg}%,${u.totalPoints || 0},"${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : ''}"\n`;
  });
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'learnbright_students.csv';
  a.click();
}

export function renderSettings() {
  const totalJsonFiles = state.allAssignments.length;
  document.getElementById('ap-settings').innerHTML = `
    <div class="admhdr"><div><h2>⚙️ Settings</h2><p>Manage LearnBright.</p></div></div>
    <div class="bcard"><h3>🔐 Change Admin Password</h3>
      <div class="fg"><label>Current Password</label><input type="password" id="sc" placeholder="Current password"/></div>
      <div class="fg"><label>New Password (min 6 chars)</label><input type="password" id="sn" placeholder="New password"/></div>
      <div class="fg"><label>Confirm New Password</label><input type="password" id="sf" placeholder="Repeat new password"/></div>
      <button class="btn-sv" onclick="chgPass()">Update Password</button>
    </div>
    <div class="bcard"><h3>📊 Data Management</h3>
      <p style="color:#6B7280;font-size:.9rem;margin-bottom:14px">Export or clear records. <strong>Clearing is permanent.</strong></p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-sm" style="padding:9px 16px" onclick="exportCSV()">📥 Export Student CSV</button>
        <button class="btn-sm dng" style="padding:9px 16px" onclick="clrStudents()">🗑 Clear All Students</button>
        <button class="btn-sm dng" style="padding:9px 16px" onclick="clrCustom()">🗑 Clear Custom Assignments</button>
      </div>
    </div>
    <div class="bcard"><h3>📁 Question Bank Status</h3>
      <p style="color:#6B7280;font-size:.9rem;line-height:1.8">
        JSON files loaded: <strong>${totalJsonFiles}</strong><br>
        Custom assignments: <strong>${getCustom().length}</strong><br>
        Registered students: <strong>${Object.keys(getUsers()).length}</strong><br>
        <br>
        To add more questions: create a new JSON file in the <code>questions/</code> folder<br>
        and add its path to <code>questions/manifest.json</code>.<br>
        See <strong>HOW_TO_ADD_QUESTIONS.md</strong> for full instructions.
      </p>
    </div>`;
}

export function chgPass() {
  const current = document.getElementById('sc')?.value;
  const next = document.getElementById('sn')?.value;
  const confirmValue = document.getElementById('sf')?.value;
  if (current !== getAdminPass()) { toast('Current password wrong!'); return; }
  if (next.length < 6) { toast('New password must be 6+ chars.'); return; }
  if (next !== confirmValue) { toast('Passwords do not match!'); return; }
  localStorage.setItem(ADMIN_KEY, next);
  toast('Password updated! ✅');
}

export function clrStudents() {
  if (!confirm('Delete ALL student data?')) return;
  localStorage.removeItem(USERS_KEY);
  toast('All students cleared.');
  renderSettings();
}

export function clrCustom() {
  if (!confirm('Delete ALL custom assignments?')) return;
  localStorage.removeItem(CUSTOM_KEY);
  toast('Custom assignments cleared.');
  renderSettings();
}
