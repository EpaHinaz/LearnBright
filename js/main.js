import { loadAssignments } from './data.js';
import { state } from './state.js';
import * as auth from './auth.js';
import * as ui from './ui.js';
import * as quiz from './quiz.js';
import * as admin from './admin.js';
import * as builder from './builder.js';

window.sw = auth.sw;
window.doRegister = auth.doRegister;
window.doSignin = auth.doSignin;
window.doAdminLogin = auth.doAdminLogin;
window.logout = auth.logout;
window.showTab = ui.showTab;
window.showAdminTab = ui.showAdminTab;
window.startAssignment = quiz.startAssignment;
window.selOpt = quiz.selOpt;
window.checkAns = quiz.checkAns;
window.nextQ = quiz.nextQ;
window.finishQuiz = quiz.finishQuiz;
window.exitQuiz = quiz.exitQuiz;
window.openStudent = admin.openStudent;
window.closeModal = admin.closeModal;
window.delStudent = admin.delStudent;
window.exportCSV = admin.exportCSV;
window.chgPass = admin.chgPass;
window.clrStudents = admin.clrStudents;
window.clrCustom = admin.clrCustom;
window.bAddQ = builder.bAddQ;
window.bChType = builder.bChType;
window.bRmQ = builder.bRmQ;
window.bSave = builder.bSave;
window.delCustom = builder.delCustom;
window.previewCustom = builder.previewCustom;
window.viewCustom = builder.viewCustom;
window.setFilter = ui.setFilter;
window.renderDash = ui.renderDash;

async function init() {
  await loadAssignments();
  const loadedCount = state.allAssignments.length;
  if (!loadedCount) {
    console.warn('No assignments loaded.');
  }
  const msg = loadedCount ? `✅ ${loadedCount} assignments loaded!` : '⚠️ No question files found. Check questions/manifest.json';
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }
}

init();
