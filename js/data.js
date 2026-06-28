import { state } from './state.js';
import { QUESTIONS_PATH, MANIFEST_PATH, SUBJECTS } from './config.js';
import { toast } from './utils.js';

function resolveSubject(dataSubject, filePath) {
  const normalizedPath = (filePath || '').split('/')[0] || '';
  const pathSubject = SUBJECTS.find(s => s.id === normalizedPath);
  if (pathSubject) return pathSubject.id;

  const normalizedSubject = String(dataSubject || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const matched = SUBJECTS.find(s => normalizeString(s.id) === normalizedSubject || normalizeString(s.label) === normalizedSubject);
  if (matched) return matched.id;
  return 'math';
}

function normalizeString(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizePath(path) {
  return path.replace(/\/+/g, '/').replace(/\.\//g, '');
}

function joinPath(base, relative) {
  const url = new URL(base, window.location.href);
  return new URL(relative, url).pathname.replace(/^\//, '');
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function loadPathsFromManifest() {
  try {
    const response = await fetch(MANIFEST_PATH);
    if (!response.ok) return [];
    const manifest = await response.json();
    if (!Array.isArray(manifest.files)) return [];
    return manifest.files.map(file => normalizePath(joinPath(QUESTIONS_PATH, file)));
  } catch {
    return [];
  }
}

function parseDirectoryListing(htmlText, basePath) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const anchors = Array.from(doc.querySelectorAll('a[href]'));
  const jsonFiles = [];
  const directories = [];

  anchors.forEach(anchor => {
    let href = anchor.getAttribute('href') || '';
    href = href.split('?')[0].split('#')[0];
    if (!href || href === '../' || href === './') return;
    if (href.endsWith('/')) {
      directories.push(normalizePath(joinPath(basePath, href)));
      return;
    }
    if (href.toLowerCase().endsWith('.json')) {
      jsonFiles.push(normalizePath(joinPath(basePath, href)));
      return;
    }
  });

  return { jsonFiles, directories };
}

async function scanFolderForJson(folderPath, seen = new Set()) {
  const normalizedFolder = normalizePath(folderPath).replace(/\\/g, '/');
  if (seen.has(normalizedFolder)) return [];
  seen.add(normalizedFolder);

  const folderUrl = new URL(normalizedFolder, window.location.href).href;
  try {
    const response = await fetch(folderUrl);
    if (!response.ok) return [];
    const body = await response.text();
    const { jsonFiles, directories } = parseDirectoryListing(body, normalizedFolder);
    const nestedFiles = await Promise.all(directories.map(dir => scanFolderForJson(dir, seen)));
    const allFiles = jsonFiles.slice();
    nestedFiles.forEach(list => list.forEach(file => allFiles.push(file)));
    return Array.from(new Set(allFiles));
  } catch {
    return [];
  }
}

export async function loadAssignments() {
  try {
    let files = await loadPathsFromManifest();
    if (!files.length) {
      files = await scanFolderForJson(QUESTIONS_PATH);
      if (files.length) {
        console.info('Loaded question file list from folders instead of manifest.');
      }
    }

    if (!files.length) {
      throw new Error('No question files found');
    }

    const results = await Promise.allSettled(
      files.map(path => fetchJson(path))
    );

    const assignments = [];
    results.forEach((result, index) => {
      if (result.status !== 'fulfilled' || !result.value) return;
      const data = result.value;
      const fileName = files[index];
      const id = 'json-' + fileName.replace(/[\/\.]/g, '-');
      const gradeMatch = fileName.match(/grade(\d)/);
      const grade = String(data.grade || (gradeMatch ? gradeMatch[1] : '4'));
      const subject = resolveSubject(data.subject, fileName);
      const questions = Array.isArray(data.questions) ? data.questions.map(q => ({
        type: q.options && q.options.length > 0 ? 'mc' : 'fill',
        text: q.q || '',
        options: q.options && q.options.length ? q.options : [],
        answer: q.answer,
        explanation: q.explanation || ''
      })) : [];
      assignments.push({
        id,
        subject,
        grade,
        title: data.title || 'Untitled',
        description: data.description || '',
        passage: data.passage || null,
        sourceFile: fileName,
        questions
      });
    });

    state.allAssignments = assignments;
    state.allAssignments.forEach(a => {
      a.questions.forEach(q => {
        if (q.type === 'mc' && q.answerIndex === undefined) {
          q.answerIndex = q.options.indexOf(q.answer);
        }
      });
    });
    return true;
  } catch (error) {
    console.warn('Could not load questions:', error.message);
    toast('Could not load question bank.');
    return false;
  }
}
