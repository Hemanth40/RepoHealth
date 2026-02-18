import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// List of file extensions to include in the analysis
const ALLOWED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.java', '.c', '.cpp', '.h', '.rs', '.php', '.css', '.html', '.json', '.md'
];

// List of directories and files to ignore
const IGNORED_PATHS = [
  'node_modules', 'dist', 'build', '.git', '.next', 'coverage', 'yarn.lock', 'package-lock.json', '.ico', '.png', '.jpg', '.jpeg', '.svg', '.gif'
];

export async function fetchRepoContent(repoUrl) {
  try {
    // 1. Parse Owner and Repo from URL
    const { owner, repo } = parseRepoUrl(repoUrl);
    if (!owner || !repo) {
      throw new Error("Invalid GitHub URL");
    }

    console.log(`Fetching repo: ${owner}/${repo}`);

    // 2. Get the default branch (usually main or master)
    const { data: repoData } = await octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo,
    });
    const defaultBranch = repoData.default_branch;

    // 3. Get the Git Tree (Recursive)
    // Limits: GitHub API might have limits on tree size. For a demo, this is fine.
    // robust apps would implementation pagination or simpler fetch.
    const { data: treeData } = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1', {
      owner,
      repo,
      tree_sha: defaultBranch,
    });

    // 4. Filter files
    const allFiles = treeData.tree.filter(item => item.type === 'blob');

    // Prioritize and select important files (Limit to ~20-30 to avoid token limits)
    // We sort by size (small enough to read) and standard naming conventions
    const relevantFiles = allFiles.filter(file => {
      const isAllowedExt = ALLOWED_EXTENSIONS.some(ext => file.path.endsWith(ext));
      const isIgnored = IGNORED_PATHS.some(path => file.path.includes(path));
      // Skip huge files
      const isReasonableSize = file.size < 50000; // < 50KB
      return isAllowedExt && !isIgnored && isReasonableSize;
    }).slice(0, 5); // Hard limit for demo

    // 5. Fetch content for each file
    const fileContents = await Promise.all(relevantFiles.map(async (file) => {
      const { data: contentData } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path: file.path
      });

      // GitHub API returns content in base64
      const content = Buffer.from(contentData.content, 'base64').toString('utf-8');
      return {
        path: file.path,
        content: content
      };
    }));

    return fileContents;

  } catch (error) {
    console.error("Error fetching repo:", error);
    throw new Error(error.message || "Failed to fetch repository");
  }
}

function parseRepoUrl(url) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    let repo = parts[1];
    if (repo && repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }
    return {
      owner: parts[0],
      repo: repo
    };
  } catch (e) {
    return { owner: null, repo: null };
  }
}
