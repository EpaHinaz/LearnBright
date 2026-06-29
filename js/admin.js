import { state } from './state.js';
import { getUsers, saveUsers, getAllA, getCustom, getAdminPass, saveAdminPass, clearUsers, clearCustom, getSetting, setSetting } from './storage.js';
import { esc, toast } from './utils.js';
import { getSubjectMeta, SUBJECTS } from './config.js';

/**
 * ENHANCED STUDENT DASHBOARD WITH METRICS
 */
export function renderAdminStudents() {
  const users = getUsers();
  const rows = Object.values(users);
  
  if (!rows.length) {
    document.getElementById('ap-students').innerHTML = '<div class="empty"><div class="ei">👥</div><p>No students yet.</p></div>';
    return;
  }

  // Calculate comprehensive metrics
  const totalStudents = rows.length;
  const totalAssignmentsDone = rows.reduce((sum, u) => sum + Object.keys(u.completedAssignments || {}).length, 0);
  const avgsByStudent = rows.map(u => {
    const vals = Object.values(u.completedAssignments || {});
    return vals.length ? vals.reduce((s, v) => s + (v.pct || 0), 0) / vals.length : null;
  }).filter(x => x !== null);
  const classAverage = avgsByStudent.length ? Math.round(avgsByStudent.reduce((s, v) => s + v, 0) / avgsByStudent.length) : 0;
  
  // Grade distribution
  const gradeDistribution = rows.reduce((acc, u) => {
    acc[u.grade] = (acc[u.grade] || 0) + 1;
    return acc;
  }, {});

  // Subject performance
  const subjectStats = SUBJECTS.map(subject => {
    const subjectAssignments = getAllA().filter(a => a.subject === subject.id);
    const completions = rows.reduce((sum, u) => {
      const completed = subjectAssignments.filter(a => u.completedAssignments?.[a.id]).length;
      return sum + completed;
    }, 0);
    const totalPossible = subjectAssignments.length * totalStudents;
    const completion = totalPossible > 0 ? Math.round((completions / totalPossible) * 100) : 0;
    return { subject, completion, completions };
  });

  // Top performers
  const topPerformers = rows
    .map(u => {
      const vals = Object.values(u.completedAssignments || {});
      return { name: u.name, avg: vals.length ? Math.round(vals.reduce((s, v) => s + (v.pct || 0), 0) / vals.length) : 0, done: vals.length };
    })
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  // Activity this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeThisWeek = rows.filter(u => u.lastLogin && new Date(u.lastLogin) > weekAgo).length;

  // Build table rows
  const tRows = rows.map(u => {
    const vals = Object.values(u.completedAssignments || {});
    const done = vals.length;
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayDone = Object.values(u.completedAssignments || {})
      .filter(r => r.date && String(r.date).slice(0, 10) === todayKey).length;
    const todayAssigned = (u.todayAssignmentsDate === todayKey && u.todayAssignments) 
      ? Object.values(u.todayAssignments).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0) 
      : 0;
    const avg = done ? Math.round(vals.reduce((s, v) => s + (v.pct || 0), 0) / done) : 0;
    const pts = u.totalPoints || 0;
    const last = u.lastLogin 
      ? new Date(u.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
      : '—';
    const bc = avg >= 80 ? 'var(--mint)' : avg >= 60 ? 'var(--sun)' : 'var(--coral)';
    const n = u.name.replace(/'/g, "\\'");
    
    return `<tr>
      <td><strong>${esc(u.name)}</strong></td>
      <td><span class="pill pg${u.grade}">Gr ${u.grade}</span></td>
      <td>${esc(u.email || '—')}</td>
      <td>${done}</td>
      <td>${todayDone}/${todayAssigned}</td>
      <td><div class="sbarw"><div class="sbarbg"><div class="sbarfg" style="width:${avg}%;background:${bc}"></div></div><strong>${avg}%</strong></div></td>
      <td><strong style="color:var(--sun)">${pts}</strong></td>
      <td>${last}</td>
      <td><button class="btn-sm" onclick="openStudentDetail('${n}')">View</button> <button class="btn-sm dng" onclick="delStudent('${n}')">Delete</button></td>
    </tr>`;
  }).join('');

  // Top performers HTML
  const topHtml = topPerformers.map((p, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:9px;background:var(--soft)">
      <span style="font-weight:900;font-size:1.2rem;color:var(--sun)">#${i + 1}</span>
      <div style="flex:1">
        <strong>${esc(p.name)}</strong>
        <div style="font-size:.82rem;color:#6B7280">${p.done} completed</div>
      </div>
      <span style="font-weight:900;color:var(--sky)">${p.avg}%</span>
    </div>
  `).join('');

  // Subject performance bar chart
  const subjectHtml = subjectStats.map(s => `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:.9rem">
        <strong>${s.subject.icon} ${s.subject.short}</strong>
        <span style="color:#6B7280">${s.completions} completions · ${s.completion}%</span>
      </div>
      <div style="background:var(--border);height:8px;border-radius:8px;overflow:hidden">
        <div style="background:${s.subject.color};height:100%;width:${s.completion}%;border-radius:8px;transition:width .3s"></div>
      </div>
    </div>
  `).join('');

  document.getElementById('ap-students').innerHTML = `
    <div class="admhdr"><div><h2>👥 Student Dashboard</h2><p>${totalStudents} students · ${totalAssignmentsDone} assignments done · Class avg ${classAverage}%</p></div></div>
    
    <div class="sgrid" style="margin-bottom:18px">
      <div class="scard"><div class="snum" style="color:var(--sky)">${totalStudents}</div><div class="slbl">Students</div></div>
      <div class="scard"><div class="snum" style="color:var(--mint)">${totalAssignmentsDone}</div><div class="slbl">Assignments Done</div></div>
      <div class="scard"><div class="snum" style="color:var(--sun)">${classAverage}%</div><div class="slbl">Class Average</div></div>
      <div class="scard"><div class="snum" style="color:var(--lav)">${activeThisWeek}</div><div class="slbl">Active This Week</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px;max-width:800px">
      <div class="bcard">
        <h3>🏆 Top Performers</h3>
        <div style="display:flex;flex-direction:column;gap:8px">${topHtml || '<p style="color:#6B7280">No data yet</p>'}</div>
      </div>
      <div class="bcard">
        <h3>📚 Subject Completion</h3>
        ${subjectHtml}
      </div>
    </div>

    <div class="dtw"><h3>📋 All Students</h3>
    <div style="margin-bottom:8px;color:#6B7280;font-size:.92rem">Grade distribution: ${Object.entries(gradeDistribution).map(([g, c]) => `Grade ${g}: ${c}`).join(' · ')}</div>
      <div style="overflow-x:auto">
      <table><thead><tr><th>Name</th><th>Grade</th><th>Email</th><th>Done</th><th>Today</th><th>Avg</th><th>Pts</th><th>Last Login</th><th>Actions</th></tr></thead>
      <tbody>${tRows}</tbody></table></div></div>
    <button class="btn-sm" onclick="exportCSV()" style="padding:9px 18px;font-size:.86rem">📥 Export CSV</button>`;
}

/**
 * ANALYTICS & REPORTS SECTION
 */
export function renderAnalytics() {
  const users = Object.values(getUsers());
  const allAssignments = getAllA();
  
  if (!users.length) {
    document.getElementById('ap-analytics').innerHTML = '<div class="empty"><div class="ei">📊</div><p>No student data yet.</p></div>';
    return;
  }

  // Time-based analytics
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const getCompletionsInPeriod = (startDate) => {
    return users.reduce((sum, u) => {
      const completions = Object.values(u.completedAssignments || {})
        .filter(r => r.date && String(r.date).slice(0, 10) >= startDate)
        .length;
      return sum + completions;
    }, 0);
  };

  const completionsToday = getCompletionsInPeriod(today);
  const completionsWeek = getCompletionsInPeriod(weekAgo);
  const completionsMonth = getCompletionsInPeriod(monthAgo);

  // Performance distribution
  const allScores = users.reduce((acc, u) => {
    const scores = Object.values(u.completedAssignments || {}).map(r => r.pct || 0);
    return [...acc, ...scores];
  }, []);

  const scoreDistribution = {
    excellent: allScores.filter(s => s >= 90).length,
    good: allScores.filter(s => s >= 80 && s < 90).length,
    satisfactory: allScores.filter(s => s >= 60 && s < 80).length,
    needsWork: allScores.filter(s => s < 60).length
  };

  // Subject engagement
  const subjectEngagement = SUBJECTS.map(subject => {
    const assignments = allAssignments.filter(a => a.subject === subject.id);
    const totalAttempts = users.reduce((sum, u) => {
      return sum + assignments.filter(a => u.completedAssignments?.[a.id]).length;
    }, 0);
    return { subject, attempts: totalAttempts, avgScore: calculateSubjectAvg(users, subject.id) };
  }).sort((a, b) => b.attempts - a.attempts);

  // Most active students
  const activityRanking = users
    .map(u => ({
      name: u.name,
      completions: Object.keys(u.completedAssignments || {}).length,
      avgScore: calculateUserAvg(u),
      lastActive: u.lastLogin
    }))
    .sort((a, b) => b.completions - a.completions)
    .slice(0, 10);

  const perfDistributionHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:14px">
      <div style="background:#ECFDF5;padding:14px;border-radius:9px;text-align:center">
        <div style="font-size:1.8rem;font-weight:900;color:var(--mint)">${scoreDistribution.excellent}</div>
        <div style="font-size:.82rem;color:#065F46">Excellent (90%+)</div>
      </div>
      <div style="background:#EBF5FF;padding:14px;border-radius:9px;text-align:center">
        <div style="font-size:1.8rem;font-weight:900;color:var(--sky)">${scoreDistribution.good}</div>
        <div style="font-size:.82rem;color:#1E40AF">Good (80-89%)</div>
      </div>
      <div style="background:#FFFBEB;padding:14px;border-radius:9px;text-align:center">
        <div style="font-size:1.8rem;font-weight:900;color:var(--sun)">${scoreDistribution.satisfactory}</div>
        <div style="font-size:.82rem;color:#92400E">Satisfactory (60-79%)</div>
      </div>
      <div style="background:#FFF1F1;padding:14px;border-radius:9px;text-align:center">
        <div style="font-size:1.8rem;font-weight:900;color:var(--coral)">${scoreDistribution.needsWork}</div>
        <div style="font-size:.82rem;color:#991B1B">Needs Work (<60%)</div>
      </div>
    </div>
  `;

  const subjectEngagementHtml = subjectEngagement.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--soft);border-radius:9px;margin-bottom:8px">
      <div>
        <strong>${s.subject.icon} ${s.subject.short}</strong>
        <div style="font-size:.82rem;color:#6B7280">${s.attempts} attempts</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:900;color:var(--sky)">${s.avgScore}%</div>
        <div style="font-size:.82rem;color:#6B7280">avg score</div>
      </div>
    </div>
  `).join('');

  const activityHtml = activityRanking.map(a => {
    const lastDate = a.lastActive ? new Date(a.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never';
    return `<tr>
      <td><strong>${esc(a.name)}</strong></td>
      <td>${a.completions}</td>
      <td><strong style="color:${a.avgScore >= 80 ? 'var(--mint)' : a.avgScore >= 60 ? 'var(--sun)' : 'var(--coral)'}">${a.avgScore}%</strong></td>
      <td>${lastDate}</td>
    </tr>`;
  }).join('');

  document.getElementById('ap-analytics').innerHTML = `
    <div class="admhdr"><div><h2>📊 Analytics & Reports</h2><p>Comprehensive learning analytics and insights</p></div></div>

    <div class="sgrid" style="margin-bottom:18px">
      <div class="scard"><div class="snum" style="color:var(--sky)">${completionsToday}</div><div class="slbl">Today</div></div>
      <div class="scard"><div class="snum" style="color:var(--sun)">${completionsWeek}</div><div class="slbl">This Week</div></div>
      <div class="scard"><div class="snum" style="color:var(--mint)">${completionsMonth}</div><div class="slbl">This Month</div></div>
      <div class="scard"><div class="snum" style="color:var(--lav)">${allScores.length}</div><div class="slbl">Total Attempts</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px">
      <div class="bcard">
        <h3>📈 Performance Distribution</h3>
        ${perfDistributionHtml}
      </div>
      <div class="bcard">
        <h3>🎯 Subject Engagement</h3>
        ${subjectEngagementHtml}
      </div>
    </div>

    <div class="bcard">
      <h3>⭐ Most Active Students</h3>
      <div style="overflow-x:auto">
        <table style="width:100%">
          <thead><tr><th>Student</th><th>Completions</th><th>Avg Score</th><th>Last Active</th></tr></thead>
          <tbody>${activityHtml}</tbody>
        </table>
      </div>
    </div>
    <button class="btn-sm" onclick="exportAnalyticsCSV()" style="padding:9px 18px;font-size:.86rem;margin-top:10px">📥 Export Analytics</button>
  `;
}

/**
 * NEW STUDENT DETAILS TAB - Shows per-student analytics
 */
export function renderStudentDetails() {
  const users = getUsers();
  const studentNames = Object.keys(users);
  
  if (!studentNames.length) {
    document.getElementById('ap-student-details').innerHTML = '<div class="empty"><div class="ei">👤</div><p>No students yet.</p></div>';
    return;
  }

  // Build filter
  const filterHtml = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center">
      <div style="flex:1;min-width:200px">
        <label style="display:block;font-weight:700;font-size:.9rem;margin-bottom:5px">Student</label>
        <select id="student-filter" style="width:100%;padding:8px;border:2px solid var(--border);border-radius:8px;font-family:'Nunito',sans-serif">
          <option value="">-- Select Student --</option>
          ${studentNames.map(name => `<option value="${name}">${esc(name)}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1;min-width:150px">
        <label style="display:block;font-weight:700;font-size:.9rem;margin-bottom:5px">Subject</label>
        <select id="subject-filter" style="width:100%;padding:8px;border:2px solid var(--border);border-radius:8px;font-family:'Nunito',sans-serif">
          <option value="">-- All Subjects --</option>
          ${SUBJECTS.map(s => `<option value="${s.id}">${s.icon} ${s.label}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1;min-width:150px">
        <label style="display:block;font-weight:700;font-size:.9rem;margin-bottom:5px">Date Range</label>
        <select id="daterange-filter" style="width:100%;padding:8px;border:2px solid var(--border);border-radius:8px;font-family:'Nunito',sans-serif">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>
      <div style="padding-top:22px">
        <button class="btn-sv" onclick="renderStudentDetailsData()">Filter</button>
      </div>
    </div>
  `;

  document.getElementById('ap-student-details').innerHTML = `
    <div class="admhdr"><div><h2>👤 Student Details & Analytics</h2><p>View per-student performance and history</p></div></div>
    ${filterHtml}
    <div id="student-details-content" style="min-height:200px;color:#6B7280;text-align:center;padding:40px">Select a student to view details</div>
  `;
}

export function renderStudentDetailsData() {
  const studentName = document.getElementById('student-filter')?.value;
  const subjectFilter = document.getElementById('subject-filter')?.value || '';
  const dateRange = document.getElementById('daterange-filter')?.value || 'all';

  if (!studentName) {
    toast('Please select a student');
    return;
  }

  const users = getUsers();
  const student = users[studentName];
  if (!student) return;

  // Calculate date range
  const now = new Date();
  let startDate = null;
  if (dateRange === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (dateRange === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (dateRange === 'month') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Get filtered assignments
  let completions = Object.entries(student.completedAssignments || {})
    .map(([id, rec]) => {
      const assignment = getAllA().find(a => a.id === id);
      return { id, rec, assignment };
    })
    .filter(item => {
      if (!item.assignment) return false;
      if (subjectFilter && item.assignment.subject !== subjectFilter) return false;
      if (startDate && new Date(item.rec.date) < startDate) return false;
      return true;
    });

  // Sort by date descending
  completions.sort((a, b) => new Date(b.rec.date) - new Date(a.rec.date));

  // Calculate metrics
  const totalAttempts = completions.length;
  const avgScore = totalAttempts ? Math.round(completions.reduce((s, c) => s + (c.rec.pct || 0), 0) / totalAttempts) : 0;
  const bestScore = totalAttempts ? Math.max(...completions.map(c => c.rec.pct || 0)) : 0;
  const worstScore = totalAttempts ? Math.min(...completions.map(c => c.rec.pct || 0)) : 0;
  const perfectScores = completions.filter(c => c.rec.pct === 100).length;

  // Subject breakdown
  const subjectBreakdown = {};
  SUBJECTS.forEach(s => {
    const subjectComps = completions.filter(c => c.assignment.subject === s.id);
    const scores = subjectComps.map(c => c.rec.pct || 0);
    subjectBreakdown[s.id] = {
      subject: s,
      count: subjectComps.length,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    };
  });

  const subjectHtml = Object.values(subjectBreakdown)
    .filter(sb => sb.count > 0)
    .map(sb => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--soft);border-radius:8px;margin-bottom:8px">
        <div>
          <strong>${sb.subject.icon} ${sb.subject.short}</strong>
          <div style="font-size:.82rem;color:#6B7280">${sb.count} attempts</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:900;color:var(--sky)">${sb.avg}%</div>
          <div style="font-size:.82rem;color:#6B7280">average</div>
        </div>
      </div>
    `).join('');

  // Timeline of completions
  const timelineHtml = completions.map(c => {
    const date = new Date(c.rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    const scoreColor = c.rec.pct >= 80 ? 'var(--mint)' : c.rec.pct >= 60 ? 'var(--sun)' : 'var(--coral)';
    const meta = getSubjectMeta(c.assignment.subject);
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px">
        <div style="font-size:1.3rem">${meta.icon}</div>
        <div style="flex:1">
          <div style="font-weight:700">${esc(c.assignment.title)}</div>
          <div style="font-size:.82rem;color:#6B7280">${meta.label} · ${date}</div>
        </div>
        <div style="text-align:right;font-weight:900;color:${scoreColor};font-size:1.1rem">${c.rec.pct}%</div>
      </div>
    `;
  }).join('');

  const contentHtml = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px">
      <div class="scard">
        <div class="snum" style="color:var(--sky)">${totalAttempts}</div>
        <div class="slbl">Attempts</div>
      </div>
      <div class="scard">
        <div class="snum" style="color:var(--mint)">${avgScore}%</div>
        <div class="slbl">Average</div>
      </div>
      <div class="scard">
        <div class="snum" style="color:var(--sun)">${bestScore}%</div>
        <div class="slbl">Best Score</div>
      </div>
      <div class="scard">
        <div class="snum" style="color:var(--coral)">${worstScore}%</div>
        <div class="slbl">Worst Score</div>
      </div>
      <div class="scard">
        <div class="snum" style="color:var(--lav)">${perfectScores}</div>
        <div class="slbl">Perfect (100%)</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
      <div class="bcard">
        <h3>📚 Subject Performance</h3>
        ${subjectHtml || '<p style="color:#6B7280">No data</p>'}
      </div>
      <div class="bcard">
        <h3>📋 Student Info</h3>
        <div style="font-size:.9rem;line-height:1.8">
          <div><strong>Name:</strong> ${esc(student.name)}</div>
          <div><strong>Grade:</strong> ${student.grade}</div>
          <div><strong>Email:</strong> ${esc(student.email || 'Not provided')}</div>
          <div><strong>Total Points:</strong> ${student.totalPoints || 0}</div>
          <div><strong>Last Login:</strong> ${student.lastLogin ? new Date(student.lastLogin).toLocaleDateString() : 'Never'}</div>
        </div>
      </div>
    </div>

    <div class="bcard">
      <h3>📅 Assignment Timeline</h3>
      ${timelineHtml || '<p style="color:#6B7280;text-align:center;padding:20px">No assignments found for selected filters</p>'}
    </div>
  `;

  document.getElementById('student-details-content').innerHTML = contentHtml;
}

/**
 * JSON IMPORT FUNCTIONALITY FOR QUESTIONS
 */
export function renderImportSection() {
  const importHtml = `
    <div class="bcard">
      <h3>📥 Import Questions from JSON</h3>
      <p style="color:#6B7280;font-size:.9rem;margin-bottom:14px">Upload a JSON file with custom questions. File should be an array of assignment objects.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <input type="file" id="json-file-input" accept=".json" style="flex:1;padding:8px;border:2px solid var(--border);border-radius:8px;min-width:200px"/>
        <button class="btn-sv" onclick="importJSON()">📤 Import JSON</button>
      </div>
      <div id="import-status" style="margin-top:14px;font-size:.9rem;color:#6B7280"></div>
      <div style="margin-top:14px;padding:12px;background:var(--soft);border-radius:9px;border-left:4px solid var(--sky)">
        <strong style="font-size:.9rem">Expected JSON Format:</strong>
        <pre style="font-size:.75rem;overflow-x:auto;margin-top:8px;padding:8px;background:#fff;border-radius:6px">[
  {
    "title": "Assignment Title",
    "description": "Description",
    "subject": "math",
    "grade": 4,
    "questions": [
      {
        "q": "Question text?",
        "type": "mcq",
        "options": ["A", "B", "C", "D"],
        "answer": "B",
        "explanation": "Why B is correct"
      }
    ]
  }
]</pre>
      </div>
    </div>
  `;

  const settingsPanel = document.getElementById('ap-settings');
  if (settingsPanel) {
    // Find where to insert - after the main settings header
    const beforeBtn = settingsPanel.querySelector('.btn-sv');
    const importDiv = document.createElement('div');
    importDiv.innerHTML = importHtml;
    if (beforeBtn && beforeBtn.parentElement) {
      beforeBtn.parentElement.insertBefore(importDiv.firstElementChild, beforeBtn);
    }
  }
}

export function importJSON() {
  const fileInput = document.getElementById('json-file-input');
  const statusDiv = document.getElementById('import-status');
  
  if (!fileInput || !fileInput.files.length) {
    if (statusDiv) statusDiv.innerHTML = '<span style="color:var(--coral)">❌ Please select a file</span>';
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!Array.isArray(data)) {
        throw new Error('JSON must be an array of assignments');
      }

      const customAssignments = getCustom();
      let importedCount = 0;

      data.forEach((item, idx) => {
        try {
          // Validate required fields
          if (!item.title || !item.subject || item.grade === undefined || !Array.isArray(item.questions)) {
            throw new Error(`Item ${idx}: Missing required fields`);
          }

          const assignment = {
            id: 'imported-' + Date.now() + '-' + idx,
            title: item.title.substring(0, 100),
            description: item.description || '',
            subject: item.subject.toLowerCase(),
            grade: String(item.grade),
            passage: item.passage || null,
            questions: item.questions.map((q, qidx) => {
              if (!q.q && !q.text) throw new Error(`Q${qidx + 1}: Missing question text`);
              if (!q.type) throw new Error(`Q${qidx + 1}: Missing type`);
              
              const questionType = q.type === 'mcq' ? 'mc' : q.type === 'fill' ? 'fill' : q.type;
              
              if (questionType === 'mc') {
                if (!Array.isArray(q.options) || q.options.length < 2) {
                  throw new Error(`Q${qidx + 1}: MC questions need at least 2 options`);
                }
                const answerIndex = q.options.indexOf(q.answer);
                if (answerIndex === -1) {
                  throw new Error(`Q${qidx + 1}: Answer not found in options`);
                }
                return {
                  type: 'mc',
                  text: q.q || q.text,
                  options: q.options,
                  answer: q.answer,
                  answerIndex: answerIndex,
                  explanation: q.explanation || ''
                };
              } else if (questionType === 'fill') {
                if (!q.answer) throw new Error(`Q${qidx + 1}: Fill questions need an answer`);
                return {
                  type: 'fill',
                  text: q.q || q.text,
                  options: [],
                  answer: q.answer,
                  explanation: q.explanation || ''
                };
              }
              throw new Error(`Q${qidx + 1}: Unknown question type: ${q.type}`);
            })
          };

          customAssignments.push(assignment);
          importedCount++;
        } catch (err) {
          console.error(`Error processing item ${idx}:`, err);
        }
      });

      if (importedCount > 0) {
        saveCustom(customAssignments);
        if (statusDiv) {
          statusDiv.innerHTML = `<span style="color:var(--mint)">✅ Successfully imported ${importedCount} assignment${importedCount !== 1 ? 's' : ''}</span>`;
        }
        toast(`Imported ${importedCount} questions! 🎉`);
        fileInput.value = '';
        // Refresh custom assignments list
        setTimeout(() => {
          if (window.renderCustomList) window.renderCustomList();
        }, 500);
      } else {
        if (statusDiv) statusDiv.innerHTML = '<span style="color:var(--coral)">❌ No valid assignments found</span>';
      }
    } catch (err) {
      if (statusDiv) statusDiv.innerHTML = `<span style="color:var(--coral)">❌ Invalid JSON: ${err.message}</span>`;
    }
  };

  reader.readAsText(file);
}

window.importJSON = importJSON;

/**
 * HELPER FUNCTIONS
 */
function calculateUserAvg(user) {
  const vals = Object.values(user.completedAssignments || {});
  return vals.length ? Math.round(vals.reduce((s, v) => s + (v.pct || 0), 0) / vals.length) : 0;
}

function calculateSubjectAvg(users, subjectId) {
  const scores = [];
  users.forEach(u => {
    Object.entries(u.completedAssignments || {}).forEach(([id, rec]) => {
      const assignment = getAllA().find(a => a.id === id);
      if (assignment && assignment.subject === subjectId) {
        scores.push(rec.pct || 0);
      }
    });
  });
  return scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
}

export function exportAnalyticsCSV() {
  const users = Object.values(getUsers());
  let csv = 'Student,Grade,Completions,Average Score,Last Active,Points\n';
  
  users.forEach(u => {
    const vals = Object.values(u.completedAssignments || {});
    const avg = vals.length ? Math.round(vals.reduce((s, v) => s + (v.pct || 0), 0) / vals.length) : 0;
    const lastActive = u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never';
    csv += `"${u.name}",${u.grade},${vals.length},${avg}%,"${lastActive}",${u.totalPoints || 0}\n`;
  });

  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'learnbright_analytics_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
}

/**
 * EXISTING FUNCTIONS (kept from original)
 */
export function openStudentDetail(name) {
  const u = getUsers()[name];
  if (!u) return;
  const done = u.completedAssignments || {};
  const vals = Object.values(done);
  const avg = vals.length ? Math.round(vals.reduce((s, v) => s + (v.pct || 0), 0) / vals.length) : 0;
  let aRows = '';

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayObj = (u.todayAssignmentsDate === todayKey && u.todayAssignments) ? u.todayAssignments : {};
  const todayHtml = SUBJECTS.map(sub => {
    const ids = Array.isArray(todayObj[sub.id]) ? todayObj[sub.id] : [];
    if (!ids.length) return '';
    const items = ids.map(id => {
      const rec = u.completedAssignments?.[id];
      const a = getAllA().find(x => x.id === id);
      const title = a ? esc(a.title) : esc(id);
      return `<div style="display:inline-flex;align-items:center;gap:8px;margin-right:10px"><span style="font-size:.9rem">${rec ? '✅' : '⬜'}</span><span style="font-size:.9rem;color:#111">${title}</span></div>`;
    }).join('');
    return `<div style="margin-bottom:8px"><strong>${sub.icon} ${sub.short}:</strong> ${items}</div>`;
  }).filter(Boolean).join('') || '<div style="font-size:.9rem;color:#6B7280">No Today assignments for this student.</div>';

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
          ${ans.correct ? '✅ Correct' : '❌ ' + esc(ans.userAnswer || '—')}
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
    <div style="margin-bottom:12px;padding:10px;background:#fff;border-radius:10px"> 
      <h4 style="margin:0 0 8px 0;font-size:1rem">📅 Today's Assignments</h4>
      ${todayHtml}
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
  const todayRows = getSetting('today_rows', 2);
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
    <div class="bcard"><h3>🧠 Today Assignment Settings</h3>
      <div class="fg"><label>Rows per subject</label><input id="today-rows" type="number" min="1" step="1" style="width:100px;" value="${todayRows}"/></div>
      <button class="btn-sv" onclick="saveTodaySettings()">Save Today Settings</button>
      <p style="color:#6B7280;font-size:.9rem;margin-top:12px">This controls how many rows of daily assignments are generated for each subject.</p>
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
  // Add import section
  renderImportSection();
}

export async function chgPass() {
  const current = document.getElementById('sc')?.value;
  const next = document.getElementById('sn')?.value;
  const confirmValue = document.getElementById('sf')?.value;
  const storedPass = await getAdminPass();
  if (current !== storedPass) { toast('Current password wrong!'); return; }
  if (next.length < 6) { toast('New password must be 6+ chars.'); return; }
  if (next !== confirmValue) { toast('Passwords do not match!'); return; }
  saveAdminPass(next);
  toast('Password updated! ✅');
}

export async function saveTodaySettings() {
  const input = document.getElementById('today-rows');
  if (!input) { toast('Could not find Today settings input.'); return; }
  const rows = parseInt(input.value, 10);
  if (Number.isNaN(rows) || rows < 1) { toast('Enter a valid number of rows.'); return; }
  await setSetting('today_rows', rows);
  toast(`Saved Today assignment rows: ${rows}`);
  renderSettings();
}

export async function clrStudents() {
  if (!confirm('Delete ALL student data?')) return;
  await clearUsers();
  toast('All students cleared.');
  renderAdminStudents();
}

export async function clrCustom() {
  if (!confirm('Delete ALL custom assignments?')) return;
  await clearCustom();
  toast('Custom assignments cleared.');
  if (window.renderCustomList) window.renderCustomList();
}

window.openStudentDetail = openStudentDetail;
window.closeModal = closeModal;
window.delStudent = delStudent;
window.exportCSV = exportCSV;
window.exportAnalyticsCSV = exportAnalyticsCSV;
window.chgPass = chgPass;
window.saveTodaySettings = saveTodaySettings;
window.clrStudents = clrStudents;
window.clrCustom = clrCustom;
window.renderStudentDetails = renderStudentDetails;
window.renderStudentDetailsData = renderStudentDetailsData;
