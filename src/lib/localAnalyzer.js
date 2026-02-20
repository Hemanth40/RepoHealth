const SEVERITY_ORDER = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const COMPLEXITY_PATTERNS = [
  /\bif\s*\(/g,
  /\belse\s+if\s*\(/g,
  /\bfor\s*\(/g,
  /\bwhile\s*\(/g,
  /\bswitch\s*\(/g,
  /\bcatch\s*\(/g,
  /\bcase\s+/g,
  /\?\s*[^:]+:/g,
  /&&|\|\|/g,
];

const ISSUE_PATTERNS = [
  {
    regex: /\beval\s*\(/g,
    severity: 'Critical',
    title: 'Dynamic code execution detected',
    description:
      'Using eval can execute untrusted input and creates severe security risk.',
    recommendation: 'Remove eval and replace it with explicit parsing or whitelisted handlers.',
    type: 'security',
  },
  {
    regex: /\b(innerHTML|dangerouslySetInnerHTML)\b/g,
    severity: 'High',
    title: 'Unsafe HTML injection surface',
    description:
      'Direct HTML injection can expose cross-site scripting vulnerabilities if input is not sanitized.',
    recommendation: 'Use safe rendering patterns and sanitize user-sourced content.',
    type: 'security',
  },
  {
    regex: /\b(console\.log|print\()|TODO|FIXME/gi,
    severity: 'Low',
    title: 'Debug residue found',
    description: 'Debug statements and TODO markers indicate unfinished cleanup.',
    recommendation: 'Remove debug traces and convert TODOs into tracked issues.',
    type: 'quality',
  },
  {
    regex: /\bany\b/g,
    severity: 'Medium',
    title: 'Loose typing hotspots',
    description: 'Frequent use of any reduces type safety and increases runtime defect risk.',
    recommendation: 'Replace any with stricter, explicit types for critical flows.',
    type: 'reliability',
  },
  {
    regex: /\btry\s*{[\s\S]{0,200}catch\s*\(\w*\)\s*{\s*}/g,
    severity: 'Medium',
    title: 'Silent exception handling',
    description:
      'Empty catch blocks suppress failures and make incidents hard to debug.',
    recommendation: 'Log context, propagate recoverable errors, and return actionable failure states.',
    type: 'reliability',
  },
  {
    regex: /\b(password|secret|api[_-]?key|token)\b\s*[:=]\s*['"`][^'"`]{6,}['"`]/gi,
    severity: 'Critical',
    title: 'Potential hardcoded credential',
    description:
      'Credential-like literals were detected in source code and may leak sensitive access.',
    recommendation: 'Move secrets to environment variables and rotate exposed keys.',
    type: 'security',
  },
];

export function buildLocalReport(snapshot) {
  const analyses = snapshot.files.map((file) => analyzeFile(file));
  const totalLoc = analyses.reduce((sum, file) => sum + file.loc, 0);
  const allIssues = analyses.flatMap((file) =>
    file.issues.map((issue) => ({
      ...issue,
      file: file.path,
      complexityScore: file.complexityScore,
    })),
  );

  const issueCounts = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };

  let securityFindings = 0;
  let reliabilityFindings = 0;
  allIssues.forEach((issue) => {
    issueCounts[issue.severity] += 1;
    if (issue.type === 'security') securityFindings += 1;
    if (issue.type === 'reliability') reliabilityFindings += 1;
  });

  const averageComplexity =
    analyses.length > 0
      ? analyses.reduce((sum, file) => sum + file.complexityScore, 0) / analyses.length
      : 0;

  const largeFiles = analyses.filter((file) => file.loc > 320).length;
  const lowCommentFiles = analyses.filter((file) => file.commentRatio < 0.03 && file.loc > 80)
    .length;
  const issueDensity = analyses.length > 0 ? allIssues.length / analyses.length : 0;
  const categoryScores = {
    maintainability: clamp(
      Math.round(96 - averageComplexity * 6 - issueDensity * 5 - largeFiles * 2),
      20,
      98,
    ),
    reliability: clamp(
      Math.round(
        95 - issueCounts.Critical * 14 - issueCounts.High * 8 - reliabilityFindings * 4,
      ),
      15,
      97,
    ),
    security: clamp(
      Math.round(96 - issueCounts.Critical * 18 - securityFindings * 8 - issueCounts.High * 3),
      10,
      98,
    ),
    documentation: clamp(
      Math.round(
        70 +
          analyses.reduce((sum, file) => sum + file.commentRatio, 0) *
            (analyses.length ? 180 / analyses.length : 0) -
          lowCommentFiles * 5,
      ),
      20,
      96,
    ),
    architecture: scoreArchitecture(snapshot.files, largeFiles),
  };

  const overallScore = clamp(
    Math.round(
      categoryScores.maintainability * 0.3 +
        categoryScores.reliability * 0.25 +
        categoryScores.security * 0.25 +
        categoryScores.documentation * 0.1 +
        categoryScores.architecture * 0.1,
    ),
    10,
    99,
  );

  const riskScore = clamp(
    Math.round(
      (100 - overallScore) * 0.65 +
        issueCounts.Critical * 12 +
        issueCounts.High * 7 +
        securityFindings * 4,
    ),
    5,
    100,
  );

  const dominantRisks = buildDominantRisks({
    issueCounts,
    securityFindings,
    lowCommentFiles,
    largeFiles,
    averageComplexity,
  });

  const topIssues = allIssues
    .sort((a, b) => {
      const severityDelta =
        SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
      if (severityDelta !== 0) return severityDelta;
      return b.complexityScore - a.complexityScore;
    })
    .slice(0, 12)
    .map((issue) => ({
      file: issue.file,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      recommendation: issue.recommendation,
    }));

  const priorityFixes = topIssues.slice(0, 6).map((issue) => ({
    file: issue.file,
    suggestion: issue.recommendation,
    impact: issue.severity === 'Critical' || issue.severity === 'High' ? 'High' : 'Medium',
    effort: estimateEffort(issue),
    rationale: issue.title,
  }));

  const quickWins = buildQuickWins(topIssues, lowCommentFiles, analyses.length);
  const strengths = buildStrengths({
    averageComplexity,
    securityFindings,
    issueCounts,
    categoryScores,
  });

  return {
    reportVersion: '2.0',
    generatedAt: new Date().toISOString(),
    project: snapshot.project,
    overallScore,
    grade: deriveGrade(overallScore),
    confidence: clamp(
      Math.round(42 + Math.min(snapshot.files.length, 28) * 1.7 + Math.min(totalLoc, 9000) / 180),
      45,
      96,
    ),
    summary: buildSummary({
      overallScore,
      riskScore,
      issueCounts,
      averageComplexity,
      topIssues,
    }),
    categories: categoryScores,
    risk: {
      level: deriveRiskLevel(riskScore),
      score: riskScore,
      dominantRisks,
    },
    heatmap: analyses
      .sort((a, b) => b.complexityScore - a.complexityScore || b.loc - a.loc)
      .slice(0, 20)
      .map((file) => ({
        file: file.path,
        complexityScore: file.complexityScore,
        issues: file.issues.length,
        loc: file.loc,
        risk: deriveRiskLevel(clamp(file.complexityScore * 10 + file.issues.length * 4, 5, 100)),
      })),
    topIssues,
    priorityFixes,
    quickWins,
    strengths,
    nextMilestones: buildMilestones(categoryScores),
    analysisMeta: {
      provider: 'local-heuristics',
      model: 'rule-engine-v2',
      filesAnalyzed: snapshot.files.length,
      estimatedLoc: totalLoc,
      fallbackUsed: false,
      sampling: snapshot.stats,
    },
  };
}

export function deriveGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 82) return 'A';
  if (score >= 74) return 'B';
  if (score >= 65) return 'C';
  if (score >= 55) return 'D';
  return 'F';
}

export function deriveRiskLevel(score) {
  if (score <= 28) return 'Low';
  if (score <= 52) return 'Moderate';
  if (score <= 75) return 'Elevated';
  return 'Critical';
}

function analyzeFile(file) {
  const lines = file.content.split('\n');
  const loc = lines.length;
  const commentLines = lines.filter((line) =>
    /^\s*(\/\/|#|\*|\/\*|\*\/)/.test(line),
  ).length;
  const commentRatio = loc > 0 ? commentLines / loc : 0;

  const complexitySignals = COMPLEXITY_PATTERNS.reduce(
    (sum, regex) => sum + countMatches(file.content, regex),
    0,
  );

  let complexityScore = clamp(
    Math.round((complexitySignals / Math.max(loc, 1)) * 140 + (loc > 260 ? 2 : 0)),
    1,
    10,
  );

  if (loc > 500) {
    complexityScore = clamp(complexityScore + 2, 1, 10);
  } else if (loc > 320) {
    complexityScore = clamp(complexityScore + 1, 1, 10);
  }

  const issues = [];
  for (const definition of ISSUE_PATTERNS) {
    const hits = countMatches(file.content, definition.regex);
    if (!hits) continue;
    issues.push({
      severity: definition.severity,
      title: definition.title,
      description: `${definition.description} Found ${hits} indicator(s) in this file.`,
      recommendation: definition.recommendation,
      type: definition.type,
    });
  }

  if (loc > 600) {
    issues.push({
      severity: 'High',
      title: 'Oversized file complexity',
      description:
        'This file exceeds 600 lines, which raises maintenance cost and review latency.',
      recommendation: 'Refactor into focused modules with clearer ownership boundaries.',
      type: 'quality',
    });
  } else if (loc > 380) {
    issues.push({
      severity: 'Medium',
      title: 'Large file needs decomposition',
      description:
        'The file is large enough to increase regression risk during changes.',
      recommendation: 'Split responsibilities by domain or layer to reduce cognitive load.',
      type: 'quality',
    });
  }

  if (commentRatio < 0.02 && loc > 120) {
    issues.push({
      severity: 'Low',
      title: 'Low in-code documentation',
      description:
        'Complex sections appear under-documented, slowing onboarding and incident triage.',
      recommendation: 'Add concise comments around critical flows and assumptions.',
      type: 'documentation',
    });
  }

  return {
    path: file.path,
    loc,
    commentRatio,
    complexityScore,
    issues: dedupeIssues(issues),
  };
}

function dedupeIssues(issues) {
  const seen = new Set();
  const result = [];

  for (const issue of issues) {
    const key = `${issue.severity}:${issue.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(issue);
  }

  return result;
}

function scoreArchitecture(files, largeFiles) {
  if (!files.length) return 40;

  const directoryCounts = new Map();
  for (const file of files) {
    const root = file.path.includes('/') ? file.path.split('/')[0] : '(root)';
    directoryCounts.set(root, (directoryCounts.get(root) || 0) + 1);
  }

  const busiestRoot = Math.max(...directoryCounts.values());
  const concentration = busiestRoot / files.length;
  return clamp(
    Math.round(
      92 -
        concentration * 26 -
        largeFiles * 3 +
        Math.min(directoryCounts.size, 6) * 2,
    ),
    25,
    96,
  );
}

function buildDominantRisks({
  issueCounts,
  securityFindings,
  lowCommentFiles,
  largeFiles,
  averageComplexity,
}) {
  const risks = [];

  if (securityFindings > 0 || issueCounts.Critical > 0) {
    risks.push('Security hardening required in critical paths');
  }
  if (averageComplexity >= 6) {
    risks.push('High branching complexity in core files');
  }
  if (largeFiles > 2) {
    risks.push('Large file surfaces increase regression probability');
  }
  if (lowCommentFiles > 0) {
    risks.push('Sparse documentation around implementation details');
  }
  if (issueCounts.High + issueCounts.Critical >= 4) {
    risks.push('Several high-severity issues need prioritized remediation');
  }

  return risks.slice(0, 4);
}

function buildSummary({
  overallScore,
  riskScore,
  issueCounts,
  averageComplexity,
  topIssues,
}) {
  if (!topIssues.length) {
    return `Codebase health is strong with an overall score of ${overallScore}/100. No major red flags were found in sampled files.`;
  }

  const keyIssue = topIssues[0];
  return `Overall score is ${overallScore}/100 with ${deriveRiskLevel(
    riskScore,
  ).toLowerCase()} operational risk. Average complexity sits at ${averageComplexity.toFixed(
    1,
  )}/10; highest-priority concern is "${keyIssue.title}" (${keyIssue.severity}). Issue distribution: ${issueCounts.Critical} critical, ${issueCounts.High} high, ${issueCounts.Medium} medium.`;
}

function buildQuickWins(topIssues, lowCommentFiles, fileCount) {
  const wins = [];

  if (topIssues.some((issue) => issue.title.includes('Debug residue'))) {
    wins.push('Remove debug logs/TODO markers from production code paths.');
  }
  if (topIssues.some((issue) => issue.title.includes('Loose typing'))) {
    wins.push('Replace high-traffic `any` types with explicit interfaces.');
  }
  if (lowCommentFiles > 0) {
    wins.push(`Add concise comments to ${lowCommentFiles} low-context file(s).`);
  }
  if (fileCount > 20) {
    wins.push('Create ownership tags for key modules to improve review velocity.');
  }

  if (!wins.length) {
    wins.push('Introduce a CI quality gate for linting and vulnerability checks.');
  }

  return wins.slice(0, 5);
}

function buildStrengths({
  averageComplexity,
  securityFindings,
  issueCounts,
  categoryScores,
}) {
  const strengths = [];

  if (averageComplexity <= 4) {
    strengths.push('Core files maintain manageable complexity levels.');
  }
  if (securityFindings === 0) {
    strengths.push('No direct high-confidence secret leakage patterns were detected.');
  }
  if (issueCounts.Critical === 0 && issueCounts.High <= 1) {
    strengths.push('High-severity defect density is currently low.');
  }
  if (categoryScores.architecture >= 75) {
    strengths.push('File distribution suggests healthy modular boundaries.');
  }

  if (!strengths.length) {
    strengths.push('Core repository structure is analyzable and remediation-ready.');
  }

  return strengths.slice(0, 4);
}

function buildMilestones(categories) {
  const milestones = [];

  if (categories.security < 75) {
    milestones.push('Run a focused security hardening sprint on auth/input/output boundaries.');
  }
  if (categories.maintainability < 75) {
    milestones.push('Refactor high-complexity files into smaller modules with test coverage.');
  }
  if (categories.documentation < 70) {
    milestones.push('Add architecture notes and contributor-facing onboarding docs.');
  }
  if (categories.reliability < 75) {
    milestones.push('Add failure-path observability and stronger error handling contracts.');
  }
  if (!milestones.length) {
    milestones.push('Automate weekly trend reporting to keep quality improvements visible.');
  }

  return milestones.slice(0, 4);
}

function estimateEffort(issue) {
  if (issue.severity === 'Critical') return 'Medium';
  if (issue.title.includes('Oversized file')) return 'High';
  if (issue.severity === 'High') return 'Medium';
  return 'Low';
}

function countMatches(content, regex) {
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
