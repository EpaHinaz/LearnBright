import { state } from './state.js';

export const ADMIN_KEY = 'lb_admin_pass';
export const USERS_KEY = 'lb_users';
export const CUSTOM_KEY = 'lb_custom';

export const getAdminPass = () => localStorage.getItem(ADMIN_KEY) || 'admin123';
export const getUsers = () => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; }
};
export const saveUsers = users => localStorage.setItem(USERS_KEY, JSON.stringify(users));
export const getCustom = () => {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch { return []; }
};
export const saveCustom = assignments => localStorage.setItem(CUSTOM_KEY, JSON.stringify(assignments));
export const getAllA = () => [...state.allAssignments, ...getCustom()];
