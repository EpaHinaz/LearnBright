import { state } from './state.js';
import { getAllA, getUsers, saveUsers } from './storage.js';
import { toast, esc, norm } from './utils.js';
import { getSubjectMeta } from './config.js';
import { showScreen, showTab } from './ui.js';

function checkFill(user, correct) {
  if (user === null || user === undefined || user === '') return false;
  return String(correct).split('|').some(c => norm(user) === norm(c));
}

export function startAssignment(id) {
  const assignment = getAllA().find(item => item.id === id);
  if (!assignment) return;
  // remember where the user started so Back returns to the same tab
  state._originTab = state.currentTab || null;
  state.quiz = { a: assignment, cur: 0, answers: new Array(assignment.questions.length).fill(null), score: 0, answered: false };
  showScreen('s-quiz');
  renderQ();
}

export function renderQ() {
  const { a, cur, answered } = state.quiz;
  if (!a) return;
  const q = a.questions[cur];
  const total = a.questions.length;
  const pct = Math.round((cur / total) * 100);

  let passH = '';
  if (a.passage) {
    const paras = a.passage.split('\n\n').map(p => `<p style="margin-bottom:9px">${esc(p)}</p>`).join('');
    passH = `<div class="pbox"><div class="ptitle">📄 Read the passage:</div>${paras}</div>`;
  }

  let ansH = '';
  if (q.type === 'mc') {
    ansH = '<div class="opts">' + q.options.map((opt, i) => {
      const sel = state.quiz.answers[cur] === i;
      let cls = sel ? 'sel' : '';
      if (answered) { cls = i === q.answerIndex ? 'ok' : (sel ? 'bad' : ''); }
      return `<button class="obtn ${cls}" onclick="selOpt(${i})" ${answered ? 'disabled' : ''}>
        <span class="oltr">${'ABCD'[i]}</span>${esc(opt)}</button>`;
    }).join('') + '</div>';
  } else {
    const val = state.quiz.answers[cur] !== null ? state.quiz.answers[cur] : '';
    const cls = answered ? (checkFill(val, q.answer) ? 'ok' : 'bad') : '';
    ansH = `<input class="finp ${cls}" id="finp" type="text" placeholder="Type your answer…" value="${esc(val)}" ${answered ? 'disabled' : ''} onkeydown="if(event.key==='Enter')checkAns()"/>`;
  }

  let fbH = '';
  if (answered) {
    const ok = q.type === 'mc'
      ? state.quiz.answers[cur] === q.answerIndex
      : checkFill(state.quiz.answers[cur], q.answer);
    fbH = `<div class="fb ${ok ? 'ok' : 'bad'}">${ok ? '✅ Correct! ' : '❌ Not quite. '}${esc(q.explanation)}</div>`;
  }

  const isLast = cur === total - 1;
  const actBtn = answered
    ? `<button class="btn-nxt" onclick="${isLast ? 'finishQuiz()' : 'nextQ()'}">${isLast ? 'See Results 🎉' : 'Next →'}</button>`
    : `<button class="btn-chk" onclick="checkAns()">Check Answer</button>`;

  document.getElementById('quiz-c').innerHTML = `
    <div class="qprog">
      <div class="qpt"><span class="qptitle">${esc(a.title)}</span><span class="qpcount">${cur + 1} / ${total}</span></div>
      <div class="pbar"><div class="pfill" style="width:${pct}%"></div></div>
    </div>
    ${passH}
    <div class="qcard">
      <div class="qnum">Question ${cur + 1}</div>
      <div class="qtext">${esc(q.text)}</div>
      ${ansH}${fbH}
    </div>
    <div class="qact">${actBtn}</div>`;

  if (q.type === 'fill') {
    const inp = document.getElementById('finp');
    if (inp && !answered) setTimeout(() => inp.focus(), 50);
  }
}

export function selOpt(i) {
  if (state.quiz.answered) return;
  state.quiz.answers[state.quiz.cur] = i;
  renderQ();
}

export function checkAns() {
  const q = state.quiz.a.questions[state.quiz.cur];
  if (q.type === 'fill') {
    const value = document.getElementById('finp')?.value?.trim() || '';
    state.quiz.answers[state.quiz.cur] = value;
  }
  if (state.quiz.answers[state.quiz.cur] === null || state.quiz.answers[state.quiz.cur] === '') {
    toast('Please enter an answer first!');
    return;
  }
  state.quiz.answered = true;
  const q2 = state.quiz.a.questions[state.quiz.cur];
  if (q2.type === 'mc' && q2.answerIndex === undefined) {
    q2.answerIndex = q2.options.indexOf(q2.answer);
  }
  const ok = q2.type === 'mc'
    ? state.quiz.answers[state.quiz.cur] === q2.answerIndex
    : checkFill(state.quiz.answers[state.quiz.cur], q2.answer);
  if (ok) state.quiz.score++;
  renderQ();
}

export function nextQ() {
  state.quiz.cur++;
  state.quiz.answered = false;
  renderQ();
}

export function finishQuiz() {
  const assignment = state.quiz.a;
  const total = assignment.questions.length;
  const pct = Math.round((state.quiz.score / total) * 100);
  const pts = state.quiz.score * 10;
  if (!state.currentUser.completedAssignments) state.currentUser.completedAssignments = {};
  const prev = state.currentUser.completedAssignments[assignment.id];

  const ansLog = state.quiz.answers.map((ans, index) => {
    const q = assignment.questions[index];
    const correct = q.type === 'mc'
      ? ans === q.answerIndex
      : checkFill(ans, q.answer);
    const dispUser = q.type === 'mc' ? (ans !== null && q.options ? q.options[ans] : '—') : (ans || '—');
    return {
      questionText: q.text,
      type: q.type,
      userAnswer: dispUser,
      correctAnswer: q.answer,
      correct
    };
  });

  state.currentUser.completedAssignments[assignment.id] = { pct, pts, date: new Date().toISOString(), answers: ansLog };
  if (!prev || pct > (prev.pct || 0)) {
    const earned = prev ? Math.max(0, pts - (prev.pts || 0)) : pts;
    state.currentUser.totalPoints = (state.currentUser.totalPoints || 0) + earned;
  }
  if (!state.currentUser.history) state.currentUser.history = [];
  state.currentUser.history.unshift({ id: assignment.id, title: assignment.title, subject: assignment.subject, pct, date: new Date().toISOString() });
  if (state.currentUser.history.length > 60) state.currentUser.history.pop();
  const users = getUsers();
  users[state.currentUser.name] = state.currentUser;
  saveUsers(users);

  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '💪';
  const msg = pct >= 90 ? 'Outstanding work! You\'re a star!' : pct >= 70 ? 'Great job! Keep it up!' : pct >= 50 ? 'Good effort — review and try again!' : 'Don\'t give up! Practice makes perfect!';
  const breakdown = assignment.questions.map((q, index) => {
    const result = ansLog[index];
    const ok = result.correct;
    const ua = result.userAnswer || '—';
    return `<div class="bdi"><span>Q${index + 1}: ${esc(q.text.substring(0, 48))}${q.text.length > 48 ? '…' : ''}</span><span class="${ok ? 'bok' : 'bbad'}">${ok ? '✓' : '✗ ' + esc(ua)}</span></div>`;
  }).join('');

  document.getElementById('quiz-c').innerHTML = `
    <div class="rcard">
      <div class="remo">${emoji}</div>
      <div class="rtitle">${esc(assignment.title)}</div>
      <div class="rscore">${pct}<span>%</span></div>
      <div class="rmsg">${msg}</div>
      <div style="font-size:.92rem;color:#6B7280;margin-bottom:16px">
        Got <strong>${state.quiz.score}</strong> of <strong>${total}</strong> correct · earned <strong style="color:var(--sun)">${pts} pts</strong>
      </div>
      <div class="rbdown">${breakdown}</div>
    </div>
    <div class="ract">
      <button class="btn-rt" onclick="startAssignment('${assignment.id}')">🔄 Try Again</button>
      <button class="btn-hm" onclick="exitQuiz()">🏠 Back</button>
    </div>`;
}

export function exitQuiz() {
  if (state._prevAdminUser) {
    state.currentUser = state._prevAdminUser;
    state._prevAdminUser = null;
    showScreen('s-admin');
    showAdminTab('custom');
    return;
  }
  showScreen('s-app');
  const target = state._originTab || state.quiz.a?.subject || 'dash';
  state._originTab = null;
  showTab(target);
}
