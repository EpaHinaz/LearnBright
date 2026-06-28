import { state } from './state.js';
import { getUsers, saveUsers, getAdminPass } from './storage.js';
import { toast } from './utils.js';
import { showScreen, showTab, showAdminTab } from './ui.js';

export function sw(formId) {
  ['f-reg', 'f-signin', 'f-admin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === formId ? 'block' : 'none';
  });
  const titles = { 'f-reg': 'Create Account', 'f-signin': 'Welcome Back!', 'f-admin': 'Admin Login' };
  const heading = document.getElementById('auth-h');
  if (heading) heading.textContent = titles[formId] || '';
}

export function doRegister() {
  const name = document.getElementById('r-name')?.value.trim();
  const grade = document.getElementById('r-grade')?.value;
  const email = document.getElementById('r-email')?.value.trim();
  if (!name) { toast('Please enter your name!'); return; }
  if (!grade) { toast('Please select your grade!'); return; }
  const users = getUsers();
  if (users[name]) { toast('Name taken — try signing in.'); return; }
  const newUser = { name, grade, email, completedAssignments: {}, totalPoints: 0, history: [], lastLogin: new Date().toISOString() };
  users[name] = newUser;
  saveUsers(users);
  loginUser(newUser);
}

export function doSignin() {
  const name = document.getElementById('si-name')?.value.trim();
  if (!name) { toast('Please enter your name!'); return; }
  const users = getUsers();
  if (!users[name]) { toast('Name not found — check spelling or create account.'); return; }
  loginUser(users[name]);
}

export function doAdminLogin() {
  const pw = document.getElementById('adm-pw')?.value;
  if (pw === getAdminPass()) {
    state.isAdmin = true;
    showScreen('s-admin');
    showAdminTab('students');
    toast('Welcome, Admin! 🔐');
  } else {
    toast('Wrong password!');
  }
}

export function loginUser(userData) {
  state.currentUser = userData;
  state.currentUser.lastLogin = new Date().toISOString();
  const users = getUsers();
  users[userData.name] = state.currentUser;
  saveUsers(users);
  const nameEl = document.getElementById('hname');
  const avEl = document.getElementById('hav');
  if (nameEl) nameEl.textContent = state.currentUser.name;
  if (avEl) avEl.textContent = state.currentUser.name.charAt(0).toUpperCase();
  showScreen('s-app');
  showTab('dash');
  toast('Welcome, ' + state.currentUser.name + '! 🎉');
}

export function logout() {
  state.currentUser = null;
  state.isAdmin = false;
  state.currentFilter = null;
  showScreen('s-login');
}
