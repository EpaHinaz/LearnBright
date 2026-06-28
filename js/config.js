export const QUESTIONS_PATH = './questions/';
export const MANIFEST_PATH = './questions/manifest.json';

export const SUBJECTS = [
  { id: 'math', icon: '🔢', label: 'Mathematics', short: 'Math', color: 'var(--sky)', banner: 'Math' },
  { id: 'ela', icon: '📖', label: 'English Language Arts', short: 'ELA', color: 'var(--mint)', banner: 'ELA' },
  { id: 'science', icon: '🔬', label: 'Science', short: 'Science', color: '#eeb70a', banner: 'Science' },
  { id: 'gk', icon: '🌍', label: 'General Knowledge', short: 'General Knowledge', color: 'var(--coral)', banner: 'General Knowledge' }
];

export const SUBJECT_MAP = new Map(SUBJECTS.map(s => [s.id, s]));

export function getSubjectMeta(id) {
  return SUBJECT_MAP.get(id) || SUBJECTS[0];
}

export const SUBJECT_IDS = SUBJECTS.map(s => s.id);
export const GRADE_OPTIONS = ['4', '5'];
export const ALL_TABS = ['dash', ...SUBJECT_IDS, 'prog'];
