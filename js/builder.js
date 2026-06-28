import { state } from './state.js';
import { getCustom, saveCustom, getAllA } from './storage.js';
import { esc, toast } from './utils.js';
import { SUBJECTS } from './config.js';
import { renderQ } from './quiz.js';

function getSubjectOptions() {
  return SUBJECTS.map(subject => `<option value="${subject.id}">${subject.icon} ${subject.label}</option>`).join('');
}

export function renderBuilder() {
  state.bqList = [];
  state.bHasPassage = false;
  document.getElementById('ap-builder').innerHTML = `
    <div class="admhdr"><div><h2>➕ Create New Assignment</h2><p>Builds directly into the app — no file needed.</p></div></div>
    <div class="bcard"><h3>📋 Details</h3>
      <div class="brow">
        <div class="fg"><label>Title</label><input type="text" id="b-title" placeholder="e.g. Fraction Word Problems"/></div>
        <div class="fg"><label>Description</label><input type="text" id="b-desc" placeholder="Short description for students"/></div>
      </div>
      <div class="brow">
        <div class="fg"><label>Subject</label><select id="b-sub">${getSubjectOptions()}</select></div>
        <div class="fg"><label>Grade</label><select id="b-grade"><option value="4">Grade 4</option><option value="5">Grade 5</option></select></div>
      </div>
      <label class="ptog"><input type="checkbox" id="b-haspsg" onchange="window._builderBHasPassage=this.checked;document.getElementById('b-psgarea').style.display=this.checked?'block':'none'"/> Include a reading passage</label>
      <div id="b-psgarea" style="display:none" class="fg brow s1">
        <label>Passage Text</label>
        <textarea id="b-psg" rows="6" placeholder="Paste your reading passage here…"></textarea>
      </div>
    </div>
    <div id="b-qc"></div>
    <button class="btn-aq" onclick="bAddQ()">+ Add Question</button>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px">
      <button class="btn-sv" onclick="bSave()">💾 Save Assignment</button>
    </div>`;
  bAddQ();
}

export function bAddQ() {
  state.bqList.push({ text: '', options: ['', '', '', ''], answer: '', answerIdx: 0, ismc: true, explanation: '' });
  bRenderQs();
  setTimeout(() => { const el = document.getElementById('bqt-' + (state.bqList.length - 1)); if (el) el.focus(); }, 60);
}

export function bRenderQs() {
  const container = document.getElementById('b-qc');
  if (!container) return;
  container.innerHTML = state.bqList.map((q, i) => `
    <div class="qblk">
      <div class="qbh">
        <div class="qbnum">${i + 1}</div>
        <div class="qbtitle">Question ${i + 1}</div>
        <div style="margin-left:auto;display:flex;gap:7px;align-items:center">
          <select onchange="bChType(${i}, this.value)" style="padding:5px 9px;border:2px solid var(--border);border-radius:8px;font-family:'Nunito',sans-serif;font-weight:700;font-size:.82rem;outline:none">
            <option value="mc" ${q.ismc ? 'selected' : ''}>Multiple Choice</option>
            <option value="fill" ${!q.ismc ? 'selected' : ''}>Fill in the Blank</option>
          </select>
          ${state.bqList.length > 1 ? `<button class="btn-rmq" onclick="bRmQ(${i})">✕</button>` : ''}
        </div>
      </div>
      <div class="fg brow s1"><label>Question Text</label>
        <input type="text" id="bqt-${i}" value="${esc(q.text)}" placeholder="Enter your question…" oninput="window._builderBQList[${i}].text=this.value"/></div>
      ${q.ismc ? bMCHtml(i, q) : bFillHtml(i, q)}
      <div class="fg brow s1" style="margin-top:9px"><label>Explanation (shown after answering)</label>
        <input type="text" id="bqe-${i}" value="${esc(q.explanation)}" placeholder="Why is the correct answer correct?" oninput="window._builderBQList[${i}].explanation=this.value"/></div>
    </div>`).join('');
  window._builderBQList = state.bqList;
}

export function bMCHtml(i, q) {
  return '<div class="optbdr">' + q.options.map((opt, oi) => `
    <div class="oprow">
      <span style="font-weight:800;font-size:.82rem;width:18px;color:var(--sky)">${'ABCD'[oi]}</span>
      <input type="text" value="${esc(opt)}" placeholder="Option ${oi + 1}" oninput="window._builderBQList[${i}].options[${oi}]=this.value"/>
      <label class="crr"><input type="radio" name="cr-${i}" ${q.answerIdx === oi ? 'checked' : ''} onchange="window._builderBQList[${i}].answerIdx=${oi};window._builderBQList[${i}].answer=window._builderBQList[${i}].options[${oi}]"/> Correct</label>
    </div>`).join('') + '</div>';
}

export function bFillHtml(i, q) {
  return `<div class="fg brow s1"><label>Correct Answer <small style="color:#6B7280;font-weight:600">(use | to separate multiple accepted answers)</small></label>
    <input type="text" value="${esc(String(q.answer || ''))}" placeholder="e.g. 42  or  3/4|0.75" oninput="window._builderBQList[${i}].answer=this.value"/></div>`;
}

export function bChType(i, type) {
  state.bqList[i].ismc = type === 'mc';
  if (type === 'mc') state.bqList[i].options = ['', '', '', ''];
  bRenderQs();
}

export function bRmQ(i) {
  state.bqList.splice(i, 1);
  bRenderQs();
}

export function bSave() {
  const title = (document.getElementById('b-title')?.value || '').trim();
  const desc = (document.getElementById('b-desc')?.value || '').trim();
  const subject = document.getElementById('b-sub')?.value || 'math';
  const grade = document.getElementById('b-grade')?.value || '4';
  const passage = document.getElementById('b-haspsg')?.checked ? (document.getElementById('b-psg')?.value || '').trim() : '';

  if (!title) { toast('Please enter a title!'); return; }
  if (!state.bqList.length) { toast('Add at least one question!'); return; }

  state.bqList.forEach((q, i) => {
    const textEl = document.getElementById('bqt-' + i);
    const expEl = document.getElementById('bqe-' + i);
    if (textEl) q.text = textEl.value.trim();
    if (expEl) q.explanation = expEl.value.trim();
    if (q.ismc) q.answer = q.options[q.answerIdx] || '';
  });

  for (let i = 0; i < state.bqList.length; i++) {
    const q = state.bqList[i];
    if (!q.text) { toast(`Q${i + 1} needs question text!`); return; }
    if (q.ismc && q.options.filter(opt => opt.trim()).length < 2) { toast(`Q${i + 1} needs at least 2 options!`); return; }
    if (!q.answer && q.answer !== '0') { toast(`Q${i + 1} needs a correct answer!`); return; }
  }

  const newAssignment = {
    id: 'custom-' + Date.now(),
    subject,
    grade,
    title,
    description: desc || 'Custom assignment.',
    passage: passage || null,
    questions: state.bqList.map(q => ({
      type: q.ismc ? 'mc' : 'fill',
      text: q.text,
      options: q.ismc ? [...q.options] : [],
      answer: q.answer,
      answerIndex: q.ismc ? q.answerIdx : undefined,
      explanation: q.explanation
    }))
  };
  newAssignment.questions.forEach(q => {
    if (q.type === 'mc') q.answerIndex = q.options.indexOf(q.answer);
  });
  const customs = getCustom();
  customs.push(newAssignment);
  saveCustom(customs);
  toast(`"${title}" saved! 🎉`);
  renderBuilder();
}

export function renderCustomList() {
  const customs = getCustom();
  const container = document.getElementById('ap-custom');
  if (!container) return;
  if (!customs.length) {
    container.innerHTML = '<div class="admhdr"><div><h2>📋 Custom Assignments</h2><p>None yet.</p></div></div><div class="empty"><div class="ei">📭</div><p>Use "Add Assignment" to create one.</p></div>';
    return;
  }
  container.innerHTML = `<div class="admhdr"><div><h2>📋 Custom Assignments</h2><p>${customs.length} assignment${customs.length !== 1 ? 's' : ''}</p></div></div>
    <div class="agrid">` + customs.map(a => {
      const meta = SUBJECTS.find(s => s.id === a.subject) || SUBJECTS[0];
      return `
      <div class="acard" style="border-left:4px solid var(--mint);position:relative">
        <button style="position:absolute;top:10px;right:10px;background:none;border:none;cursor:pointer;color:var(--coral);font-size:.95rem;opacity:.6" onclick="delCustom('${a.id}', event)">🗑</button>
        <div class="atype">${meta.icon} ${meta.short} · Gr ${a.grade} <span class="custom-tag">Custom</span></div>
        <div class="atitle">${esc(a.title)}</div>
        <div style="font-size:.82rem;color:#6B7280;margin-top:3px">${esc(a.description)}</div>
        <div class="ameta"><span>📝 ${a.questions.length} Qs</span><span>⭐ ${a.questions.length * 10} pts</span></div>
        <div style="display:flex;gap:8px;margin-top:11px;flex-wrap:wrap">
          <button class="btn-sm" onclick="viewCustom('${a.id}')">👁 View Details</button>
          <button class="btn-sm" onclick="previewCustom('${a.id}')">▶ Preview</button>
        </div>
      </div>`;
    }).join('') + '</div>';
}

export function viewCustom(id) {
  const assignment = getCustom().find(x => x.id === id);
  if (!assignment) return;
  const meta = SUBJECTS.find(s => s.id === assignment.subject) || SUBJECTS[0];
  const questionsHtml = assignment.questions.map((q, index) => {
    const answerText = q.type === 'mc'
      ? esc(q.options[q.answerIndex] || q.answer || '')
      : esc(q.answer || '');
    const optionsHtml = q.type === 'mc' ? `<div class="opt-list">${q.options.map((opt, oi) => `<div class="opt-item${q.answerIndex === oi ? ' correct' : ''}">${esc(opt)}</div>`).join('')}</div>` : '';
    return `<div class="qblk" style="border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><strong>Q${index + 1}</strong><span>${q.type === 'mc' ? 'Multiple choice' : 'Fill in the blank'}</span></div>
      <div style="margin-bottom:10px;font-weight:700">${esc(q.text)}</div>
      ${optionsHtml}
      <div style="font-size:.92rem;color:#111"><strong>Answer:</strong> ${answerText}</div>
      ${q.explanation ? `<div style="margin-top:8px;color:#6B7280"><strong>Explanation:</strong> ${esc(q.explanation)}</div>` : ''}
    </div>`;
  }).join('');

  document.getElementById('stmodal-body').innerHTML = `
    <h3>📋 ${esc(assignment.title)} <button class="mcls" onclick="closeModal()">✕</button></h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">
      <span class="pill ${assignment.subject}">${meta.icon} ${meta.short}</span>
      <span class="pill pg${assignment.grade}">Grade ${assignment.grade}</span>
      <span style="font-size:.9rem;color:#6B7280">${assignment.questions.length} questions</span>
    </div>
    <div style="margin-bottom:16px;color:#4B5563">${esc(assignment.description || 'No description provided.')}</div>
    ${assignment.passage ? `<div class="bcard" style="margin-bottom:16px"><h4>Passage</h4><p style="white-space:pre-wrap;line-height:1.6">${esc(assignment.passage)}</p></div>` : ''}
    <div>${questionsHtml}</div>`;
  document.getElementById('stmodal').classList.add('open');
}

export function previewCustom(id) {
  const assignment = getAllA().find(x => x.id === id);
  if (!assignment) return;
  state._prevAdminUser = state.currentUser;
  state.currentUser = { name: '[Preview]', grade: assignment.grade, completedAssignments: {}, totalPoints: 0, history: [] };
  assignment.questions.forEach(q => {
    if (q.type === 'mc' && q.answerIndex === undefined) q.answerIndex = q.options.indexOf(q.answer);
  });
  state.quiz = { a: assignment, cur: 0, answers: new Array(assignment.questions.length).fill(null), score: 0, answered: false };
  showScreen('s-quiz');
  renderQ();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}
