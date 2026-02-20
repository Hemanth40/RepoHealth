import { Octokit } from 'octokit';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const DEFAULT_LIMITS = {
  maxFiles: 28,
  maxFileSize: 100_000,
};

const CODE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rb',
  '.go',
  '.java',
  '.kt',
  '.c',
  '.cc',
  '.cpp',
  '.h',
  '.hpp',
  '.rs',
  '.php',
  '.swift',
  '.cs',
  '.scala',
  '.sql',
  '.css',
  '.scss',
  '.html',
  '.md',
  '.json',
  '.yml',
  '.yaml',
  '.toml',
  '.sh',
]);

const PRIORITY_SEGMENTS = [
  'src/',
  'app/',
  'lib/',
  'core/',
  'server/',
  'api/',
  'services/',
  'components/',
  'utils/',
];

const DEPRIORITIZED_SEGMENTS = [
  'test/',
  '__tests__/',
  '.github/',
  'docs/',
  'examples/',
  'fixtures/',
];

const IGNORED_SEGMENTS = [
  'node_modules/',
  '.git/',
  '.next/',
  'dist/',
  'build/',
  'coverage/',
  'vendor/',
  'out/',
];

const IGNORED_SUFFIXES = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.lock',
  '.min.js',
  '.map',
];

export function parseRepoInput(input) {
  if (typeof input !== 'string') {
    return { owner: null, repo: null, normalized: null };
  }

  const value = input.trim().replace(/\/+$/, '');
  if (!value) {
    return { owner: null, repo: null, normalized: null };
  }

  const shortMatch = value.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shortMatch) {
    const owner = shortMatch[1];
    const repo = normalizeRepoName(shortMatch[2]);
    return { owner, repo, normalized: `https://github.com/${owner}/${repo}` };
  }

  try {
    const parsed = new URL(value);
    if (!parsed.hostname.toLowerCase().includes('github.com')) {
      return { owner: null, repo: null, normalized: null };
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      return { owner: null, repo: null, normalized: null };
    }

    const owner = segments[0];
    const repo = normalizeRepoName(segments[1]);
    return { owner, repo, normalized: `https://github.com/${owner}/${repo}` };
  } catch {
    return { owner: null, repo: null, normalized: null };
  }
}

export async function fetchRepoSnapshot(repoInput, limits = DEFAULT_LIMITS) {
  const { owner, repo, normalized } = parseRepoInput(repoInput);
  if (!owner || !repo) {
    throw new Error('Enter a valid GitHub repository URL or owner/repo string.');
  }

  const { data: repository } = await octokit.request('GET /repos/{owner}/{repo}', {
    owner,
    repo,
  });

  const defaultBranch = repository.default_branch;
  const { data: tree } = await octokit.request(
    'GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1',
    {
      owner,
      repo,
      tree_sha: defaultBranch,
    },
  );

  const blobs = tree.tree.filter((item) => item.type === 'blob');
  const candidates = blobs
    .filter((item) => isAllowedFile(item.path, item.size ?? 0, limits.maxFileSize))
    .map((item) => ({
      path: item.path,
      size: item.size ?? 0,
      priority: scorePath(item.path),
    }))
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        a.size - b.size ||
        a.path.localeCompare(b.path, 'en'),
    )
    .slice(0, limits.maxFiles);

  const resolved = await Promise.allSettled(
    candidates.map((file) => fetchFileContents(owner, repo, file.path)),
  );

  const files = resolved
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter((file) => file.content.trim().length > 0);

  if (!files.length) {
    throw new Error('No analyzable source files found in this repository.');
  }

  return {
    project: {
      owner,
      repo,
      fullName: repository.full_name,
      description: repository.description || '',
      defaultBranch,
      stars: repository.stargazers_count ?? 0,
      forks: repository.forks_count ?? 0,
      openIssues: repository.open_issues_count ?? 0,
      watchers: repository.subscribers_count ?? 0,
      primaryLanguage: repository.language || 'Unknown',
      license: repository.license?.spdx_id || 'None',
      visibility: repository.private ? 'private' : 'public',
      url: normalized,
      updatedAt: repository.updated_at,
      pushedAt: repository.pushed_at,
    },
    files,
    stats: {
      totalFilesInTree: blobs.length,
      candidateFiles: candidates.length,
      loadedFiles: files.length,
      maxFiles: limits.maxFiles,
      maxFileSize: limits.maxFileSize,
    },
  };
}

async function fetchFileContents(owner, repo, path) {
  const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner,
    repo,
    path,
  });

  const data = response.data;
  if (!data || Array.isArray(data) || data.encoding !== 'base64') {
    throw new Error(`Unsupported file payload for ${path}`);
  }

  return {
    path,
    content: sanitizeFileContent(Buffer.from(data.content, 'base64').toString('utf8')),
  };
}

function normalizeRepoName(repo) {
  return repo.endsWith('.git') ? repo.slice(0, -4) : repo;
}

function sanitizeFileContent(content) {
  return content
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .slice(0, 120_000);
}

function isAllowedFile(path, size, maxFileSize) {
  const lower = path.toLowerCase();
  if (!size || size > maxFileSize) {
    return false;
  }

  if (IGNORED_SEGMENTS.some((segment) => lower.includes(segment))) {
    return false;
  }

  if (IGNORED_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
    return false;
  }

  const extension = getExtension(lower);
  return CODE_EXTENSIONS.has(extension);
}

function getExtension(path) {
  const dotIndex = path.lastIndexOf('.');
  if (dotIndex < 0) {
    return '';
  }
  return path.slice(dotIndex);
}

function scorePath(path) {
  const lower = path.toLowerCase();
  let score = 0;

  if (PRIORITY_SEGMENTS.some((segment) => lower.includes(segment))) {
    score += 3;
  }
  if (DEPRIORITIZED_SEGMENTS.some((segment) => lower.includes(segment))) {
    score -= 2;
  }

  if (lower.includes('config') || lower.includes('settings')) {
    score += 1;
  }
  if (lower.includes('readme')) {
    score -= 3;
  }

  return score;
}
