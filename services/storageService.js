const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const MEDIA_SUBFOLDERS = ['videos', 'thumbnails', 'audio', 'avatars', 'temp', 'temp/info'];

let warnedAdditionalUnavailable = false;

function pathExistsSafe(p) {
  try {
    return Boolean(p) && fs.existsSync(p);
  } catch (_) {
    return false;
  }
}

function getSystemUploadPath() {
  const fromEnv = process.env.SYSTEM_UPLOAD_PATH;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return path.join(PROJECT_ROOT, 'public', 'uploads_system');
}

function getAdditionalStoragePath() {
  const fromEnv = process.env.ADDITIONAL_STORAGE_PATH;
  return fromEnv && fromEnv.trim() ? fromEnv.trim() : '';
}

function getAdditionalUploadPath() {
  const base = getAdditionalStoragePath();
  return base ? path.join(base, 'uploads') : '';
}

function getLegacyUploadPath() {
  const fromEnv = process.env.LEGACY_UPLOAD_PATH;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return path.join(PROJECT_ROOT, 'public', 'uploads_backup');
}

function getPublicUploadPath() {
  return path.join(PROJECT_ROOT, 'public', 'uploads');
}

function getThreshold() {
  const raw = parseInt(process.env.SYSTEM_DISK_UPLOAD_THRESHOLD, 10);
  if (Number.isFinite(raw) && raw > 0 && raw <= 100) {
    return raw;
  }
  return 80;
}

function ensureSubfolders(basePath) {
  if (!basePath) return;
  for (const sub of MEDIA_SUBFOLDERS) {
    const dir = path.join(basePath, sub);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.warn(`[storageService] Could not ensure subfolder ${dir}: ${err.message}`);
    }
  }
}

function ensureUploadSubfolders() {
  ensureSubfolders(getSystemUploadPath());
  const additional = getAdditionalUploadPath();
  if (additional && pathExistsSafe(getAdditionalStoragePath())) {
    ensureSubfolders(additional);
  }
  ensureSubfolders(getPublicUploadPath());
}

function getSystemDiskUsage() {
  try {
    if (process.platform === 'win32') {
      return null;
    }
    const target = getSystemUploadPath();
    const probe = pathExistsSafe(target) ? target : PROJECT_ROOT;
    const output = execSync(`df -P -B1 "${probe}"`, { encoding: 'utf8', timeout: 5000 });
    const lines = output.trim().split('\n');
    if (lines.length < 2) return null;
    const dataLine = lines[lines.length - 1];
    const parts = dataLine.trim().split(/\s+/);
    if (parts.length < 6) return null;
    const percentStr = parts[4].replace('%', '');
    const percent = parseInt(percentStr, 10);
    return Number.isFinite(percent) ? percent : null;
  } catch (err) {
    console.warn(`[storageService] Could not read system disk usage: ${err.message}`);
    return null;
  }
}

function additionalDiskAvailable() {
  const additionalUpload = getAdditionalUploadPath();
  return pathExistsSafe(additionalUpload);
}

function shouldUseAdditionalDisk() {
  const threshold = getThreshold();
  const usage = getSystemDiskUsage();

  if (usage === null) {
    return additionalDiskAvailable();
  }

  if (usage >= threshold) {
    if (additionalDiskAvailable()) {
      return true;
    }
    if (!warnedAdditionalUnavailable) {
      console.warn(
        `[storageService] System disk usage ${usage}% >= threshold ${threshold}% but additional disk is unavailable. Falling back to system disk.`
      );
      warnedAdditionalUnavailable = true;
    }
    return false;
  }

  warnedAdditionalUnavailable = false;
  return false;
}

function getUploadBasePath() {
  if (shouldUseAdditionalDisk()) {
    const additional = getAdditionalUploadPath();
    if (additional) return additional;
  }
  return getSystemUploadPath();
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_) {}
  return dir;
}

function getVideoUploadDir() {
  return ensureDir(path.join(getUploadBasePath(), 'videos'));
}

function getThumbnailUploadDir() {
  return ensureDir(path.join(getUploadBasePath(), 'thumbnails'));
}

function getAudioUploadDir() {
  return ensureDir(path.join(getUploadBasePath(), 'audio'));
}

function getAvatarUploadDir() {
  return ensureDir(path.join(getUploadBasePath(), 'avatars'));
}

function getTempUploadDir() {
  return ensureDir(path.join(getUploadBasePath(), 'temp'));
}

function getCandidateBasePaths() {
  const result = [];
  const additional = getAdditionalUploadPath();
  if (additional) result.push(additional);
  const systemPath = getSystemUploadPath();
  if (!result.includes(systemPath)) result.push(systemPath);
  const legacy = getLegacyUploadPath();
  if (!result.includes(legacy)) result.push(legacy);
  const pub = getPublicUploadPath();
  if (!result.includes(pub)) result.push(pub);
  return result;
}

function extractRelativeUploadPath(value) {
  if (!value) return null;
  let rel = String(value).replace(/\\/g, '/').trim();
  if (path.isAbsolute(rel)) {
    return null;
  }
  if (rel.startsWith('./')) rel = rel.substring(2);
  if (rel.startsWith('/')) rel = rel.substring(1);
  if (rel.startsWith('public/')) rel = rel.substring('public/'.length);
  if (rel.startsWith('uploads/')) {
    rel = rel.substring('uploads/'.length);
  } else if (rel.startsWith('uploads_system/')) {
    rel = rel.substring('uploads_system/'.length);
  } else if (rel.startsWith('uploads_backup/')) {
    rel = rel.substring('uploads_backup/'.length);
  }
  return rel;
}

function resolveVideoFilePath(filenameOrRelativePath) {
  if (!filenameOrRelativePath) return null;

  if (path.isAbsolute(filenameOrRelativePath) && pathExistsSafe(filenameOrRelativePath)) {
    return filenameOrRelativePath;
  }

  const stripped = extractRelativeUploadPath(filenameOrRelativePath);
  let candidateRel;
  if (stripped && stripped.includes('/')) {
    candidateRel = stripped;
  } else {
    const filename = path.basename(filenameOrRelativePath);
    candidateRel = path.posix.join('videos', filename);
  }

  for (const base of getCandidateBasePaths()) {
    if (!base) continue;
    const candidate = path.join(base, candidateRel);
    if (pathExistsSafe(candidate)) {
      return candidate;
    }
  }

  return null;
}

const resolveMediaFilePath = resolveVideoFilePath;

function listVideoFilesFromAllStorages() {
  const seen = new Set();
  const results = [];

  for (const base of getCandidateBasePaths()) {
    if (!base) continue;
    const videosDir = path.join(base, 'videos');
    if (!pathExistsSafe(videosDir)) continue;

    let entries;
    try {
      entries = fs.readdirSync(videosDir, { withFileTypes: true });
    } catch (_) {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);

      const physicalPath = path.join(videosDir, entry.name);
      let stat;
      try {
        stat = fs.statSync(physicalPath);
      } catch (_) {
        continue;
      }

      results.push({
        filename: entry.name,
        physicalPath,
        relativePath: `/uploads/videos/${entry.name}`,
        storage: base,
        size: stat.size,
        modifiedAt: stat.mtime
      });
    }
  }

  return results;
}

function logResolutionFailure(filenameOrRelativePath) {
  const additional = getAdditionalUploadPath() || '(unset)';
  const system = getSystemUploadPath();
  const legacy = getLegacyUploadPath();
  console.error(
    `[storageService] Video file not found in additional disk or legacy backup. ` +
    `Searched: additional=${additional}, system=${system}, legacy=${legacy}. ` +
    `Requested: ${filenameOrRelativePath}`
  );
}

module.exports = {
  getSystemDiskUsage,
  shouldUseAdditionalDisk,
  getUploadBasePath,
  getVideoUploadDir,
  getThumbnailUploadDir,
  getAudioUploadDir,
  getAvatarUploadDir,
  getTempUploadDir,
  ensureUploadSubfolders,
  resolveVideoFilePath,
  resolveMediaFilePath,
  listVideoFilesFromAllStorages,
  getSystemUploadPath,
  getAdditionalStoragePath,
  getAdditionalUploadPath,
  getLegacyUploadPath,
  getPublicUploadPath,
  getCandidateBasePaths,
  logResolutionFailure,
  MEDIA_SUBFOLDERS
};
