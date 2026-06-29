import { state } from './state.js';
import { supabase } from './supabase-client.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const USERS_TABLE = 'users';
const CUSTOM_TABLE = 'custom_assignments';
const SETTINGS_TABLE = 'settings';

export const ADMIN_KEY = 'lb_admin_pass';
export const USERS_KEY = 'lb_users';
export const CUSTOM_KEY = 'lb_custom';
const DEFAULT_ADMIN_PASS = 'admin123';

let cachedAdminPass = localStorage.getItem(ADMIN_KEY) || DEFAULT_ADMIN_PASS;
if (!localStorage.getItem(ADMIN_KEY)) {
  localStorage.setItem(ADMIN_KEY, cachedAdminPass);
}

const hasSupabase = () => {
  return SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project-ref') && !SUPABASE_ANON_KEY.includes('your-anon-key');
};

export const getAdminPass = async () => {
  const localPass = localStorage.getItem(ADMIN_KEY);
  if (localPass) return localPass;
  if (!hasSupabase()) return DEFAULT_ADMIN_PASS;
  const { data, error } = await supabase.from(SETTINGS_TABLE).select('value').eq('key', 'admin_password').single();
  if (error || !data?.value) {
    localStorage.setItem(ADMIN_KEY, DEFAULT_ADMIN_PASS);
    return DEFAULT_ADMIN_PASS;
  }
  localStorage.setItem(ADMIN_KEY, data.value);
  return data.value;
};

export const saveAdminPass = pass => {
  cachedAdminPass = pass;
  localStorage.setItem(ADMIN_KEY, pass);
  if (hasSupabase()) {
    syncAdminPassToSupabase(pass).catch(() => {});
  }
};

export const getUsers = () => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; }
};

export const saveUsers = users => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  if (hasSupabase()) syncUsersToSupabase(users).catch(() => {});
};

export const getCustom = () => {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch { return []; }
};

export const saveCustom = assignments => {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(assignments));
  if (hasSupabase()) syncCustomToSupabase(assignments).catch(() => {});
};

export const getAllA = () => [...state.allAssignments, ...getCustom()];

export async function syncFromSupabase() {
  if (!hasSupabase()) return;
  await Promise.all([syncUsersFromSupabase(), syncCustomFromSupabase(), syncAdminPassFromSupabase()]);
}

async function syncUsersFromSupabase() {
  const { data, error } = await supabase.from(USERS_TABLE).select('name,data');
  if (error || !data) return;
  const users = data.reduce((acc, row) => {
    if (row?.name) acc[row.name] = row.data || {};
    return acc;
  }, {});
  if (Object.keys(users).length) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

async function syncCustomFromSupabase() {
  const { data, error } = await supabase.from(CUSTOM_TABLE).select('id,data');
  if (error || !data) return;
  const assignments = data.map(row => row.data).filter(Boolean);
  if (assignments.length) {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(assignments));
  }
}

async function syncAdminPassFromSupabase() {
  const { data, error } = await supabase.from(SETTINGS_TABLE).select('value').eq('key', 'admin_password').single();
  if (error || !data?.value) return;
  cachedAdminPass = data.value;
  localStorage.setItem(ADMIN_KEY, data.value);
}

async function syncAdminPassToSupabase(pass) {
  return supabase.from(SETTINGS_TABLE).upsert({ key: 'admin_password', value: pass }, { onConflict: 'key' });
}

export async function clearUsers() {
  localStorage.removeItem(USERS_KEY);
  if (hasSupabase()) {
    await supabase.from(USERS_TABLE).delete().neq('name', '');
  }
}

export async function clearCustom() {
  localStorage.removeItem(CUSTOM_KEY);
  if (hasSupabase()) {
    await supabase.from(CUSTOM_TABLE).delete().neq('id', '');
  }
}

async function syncUsersToSupabase(users) {
  const rows = Object.entries(users).map(([name, data]) => ({ name, data }));
  await supabase.from(USERS_TABLE).upsert(rows, { onConflict: 'name' });
}

async function syncCustomToSupabase(assignments) {
  const rows = assignments.map(data => ({ id: data.id, data }));
  await supabase.from(CUSTOM_TABLE).upsert(rows, { onConflict: 'id' });
}
