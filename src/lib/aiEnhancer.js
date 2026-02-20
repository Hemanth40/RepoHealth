import Groq from 'groq-sdk';
import { deriveGrade, deriveRiskLevel } from './localAnalyzer.js';

const DEFAULT_MODELS = {
  gemini: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
  groq: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
};

const CATEGORY_KEYS = [
  'maintainability',
  'reliability',
  'security',
  'documentation',
  'architecture',
];

const HYBRID_MODES = new Set(['hybrid', 'both', 'ensemble']);

const SEVERITY_RANK = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const IMPACT_RANK = {
  High: 2,
  Medium: 1,
};

const EFFORT_RANK = {
  Low: 3,
  Medium: 2,
  High: 1,
};

const SCORE_BASE_WEIGHT = parseWeight(process.env.SCORE_BASE_WEIGHT, 0.7);
const SCORE_AI_WEIGHT = 1 - SCORE_BASE_WEIGHT;

export async function enrichReportWithAI(snapshot, baselineReport) {
  const execution = resolveExecutionPlan();

  if (!execution.providers.length) {
    return withMeta(baselineReport, {
      provider: 'local-heuristics',
      model: 'rule-engine-v2',
      fallbackUsed: true,
      fallbackReason:
        'No AI provider key configured. Set GEMINI_API_KEY or GROQ_API_KEY.',
    });
  }

  const prompt = buildPrompt(snapshot, baselineReport);
  if (execution.mode === 'hybrid' && execution.providers.length > 1) {
    return runHybridFlow(execution.providers, prompt, baselineReport);
  }

  return runSequentialFlow(execution.providers, prompt, baselineReport, execution);
}

function resolveExecutionPlan() {
  const selected = (process.env.AI_PROVIDER || 'auto').toLowerCase().trim();
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const available = [];

  if (hasGemini) available.push('gemini');
  if (hasGroq) available.push('groq');

  if (HYBRID_MODES.has(selected)) {
    if (hasGemini && hasGroq) {
      return { mode: 'hybrid', providers: ['gemini', 'groq'], requested: selected };
    }
    return { mode: 'sequential', providers: available, requested: selected };
  }

  if (selected === 'gemini') {
    return { mode: 'sequential', providers: hasGemini ? ['gemini'] : [], requested: selected };
  }

  if (selected === 'groq') {
    return { mode: 'sequential', providers: hasGroq ? ['groq'] : [], requested: selected };
  }

  return { mode: 'sequential', providers: available, requested: selected };
}

async function runSequentialFlow(providers, prompt, baselineReport, execution) {
  let lastError = null;

  for (const provider of providers) {
    try {
      const completion = await requestCompletion(provider, prompt);
      const parsed = parseJsonResponse(completion.text);
      const merged = mergeReports(baselineReport, parsed);

      const degradedHybridReason =
        HYBRID_MODES.has(execution.requested) && providers.length === 1
          ? 'Hybrid mode requested, but only one provider key is configured.'
          : null;

      return withMeta(merged, {
        provider,
        model: completion.model,
        fallbackUsed: Boolean(degradedHybridReason),
        fallbackReason: degradedHybridReason,
      });
    } catch (error) {
      lastError = error;
    }
  }

  return withMeta(baselineReport, {
    provider: 'local-heuristics',
    model: 'rule-engine-v2',
    fallbackUsed: true,
    fallbackReason:
      lastError?.message || 'AI generation failed on all configured providers.',
  });
}

async function runHybridFlow(providers, prompt, baselineReport) {
  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const completion = await requestCompletion(provider, prompt);
      const parsed = parseJsonResponse(completion.text);

      return {
        provider,
        model: completion.model,
        parsed,
      };
    }),
  );

  const successes = settled
    .filter((item) => item.status === 'fulfilled')
    .map((item) => item.value);

  const failures = settled
    .filter((item) => item.status === 'rejected')
    .map((item) => item.reason);

  if (!successes.length) {
    return withMeta(baselineReport, {
      provider: 'local-heuristics',
      model: 'rule-engine-v2',
      fallbackUsed: true,
      fallbackReason: buildFailureReason(failures, 'Hybrid AI failed on all providers.'),
    });
  }

  if (successes.length === 1) {
    const mergedSingle = mergeReports(baselineReport, successes[0].parsed);
    return withMeta(mergedSingle, {
      provider: `hybrid-partial:${successes[0].provider}`,
      model: successes[0].model,
      fallbackUsed: true,
      fallbackReason: buildFailureReason(
        failures,
        'One provider failed during hybrid analysis.',
      ),
    });
  }

  const consensusMerged = mergeHybridReports(baselineReport, successes);
  return withMeta(consensusMerged, {
    provider: `hybrid:${successes.map((item) => item.provider).join('+')}`,
    model: successes.map((item) => item.model).join(' + '),
    fallbackUsed: failures.length > 0,
    fallbackReason:
      failures.length > 0
        ? buildFailureReason(failures, 'Hybrid completed with partial provider failures.')
        : null,
  });
}

function buildPrompt(snapshot, baselineReport) {
  const condensedFiles = snapshot.files.slice(0, 10).map((file) => ({
    path: file.path,
    snippet: file.content.slice(0, 1700),
  }));

  return `
You are a principal software quality reviewer. You are helping generate a production-style repository health report.
Use the local baseline as a starting point, then improve it with better prioritization and clearer recommendations.

Return ONLY valid JSON with this shape:
{
  "summary": "string",
  "categories": {
    "maintainability": 0-100,
    "reliability": 0-100,
    "security": 0-100,
    "documentation": 0-100,
    "architecture": 0-100
  },
  "risk": {
    "score": 0-100,
    "level": "Low|Moderate|Elevated|Critical",
    "dominantRisks": ["string"]
  },
  "topIssues": [
    {
      "file": "string",
      "title": "string",
      "description": "string",
      "severity": "Critical|High|Medium|Low",
      "recommendation": "string"
    }
  ],
  "priorityFixes": [
    {
      "file": "string",
      "suggestion": "string",
      "impact": "High|Medium",
      "effort": "Low|Medium|High",
      "rationale": "string"
    }
  ],
  "quickWins": ["string"],
  "strengths": ["string"],
  "nextMilestones": ["string"]
}

BASELINE REPORT:
${JSON.stringify(baselineReport, null, 2)}

PROJECT SNAPSHOT:
${JSON.stringify(
  {
    project: snapshot.project,
    files: condensedFiles,
  },
  null,
  2,
)}
`;
}

async function requestCompletion(provider, prompt) {
  if (provider === 'gemini') {
    return requestGemini(prompt);
  }

  if (provider === 'groq') {
    return requestGroq(prompt);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

async function requestGemini(prompt) {
  const model = DEFAULT_MODELS.gemini;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('') || '';

  if (!text.trim()) {
    throw new Error('Gemini returned an empty response.');
  }

  return { text, model };
}

async function requestGroq(prompt) {
  const model = DEFAULT_MODELS.groq;
  const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a strict JSON API. Return only valid JSON with no markdown.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const text = completion.choices?.[0]?.message?.content || '';
  if (!text.trim()) {
    throw new Error('Groq returned an empty response.');
  }

  return { text, model };
}

function parseJsonResponse(raw) {
  const cleaned = raw.trim();
  const extracted = extractFirstJsonObject(cleaned) || cleaned;
  return JSON.parse(extracted);
}

function extractFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function mergeReports(base, candidate) {
  const mergedCategories = { ...base.categories };
  for (const key of CATEGORY_KEYS) {
    const nextValue = candidate?.categories?.[key];
    if (Number.isFinite(nextValue)) {
      mergedCategories[key] = blendScore(base.categories[key], nextValue);
    }
  }

  const overallScore = clamp(
    Math.round(
      mergedCategories.maintainability * 0.3 +
        mergedCategories.reliability * 0.25 +
        mergedCategories.security * 0.25 +
        mergedCategories.documentation * 0.1 +
        mergedCategories.architecture * 0.1,
    ),
    10,
    99,
  );

  const riskScore = Number.isFinite(candidate?.risk?.score)
    ? blendScore(base.risk.score, candidate.risk.score)
    : base.risk.score;

  return {
    ...base,
    summary: sanitizeText(candidate?.summary) || base.summary,
    categories: mergedCategories,
    overallScore,
    grade: deriveGrade(overallScore),
    risk: {
      score: riskScore,
      level:
        sanitizeRiskLevel(candidate?.risk?.level) || deriveRiskLevel(riskScore),
      dominantRisks: normalizeStringArray(
        candidate?.risk?.dominantRisks,
        4,
        base.risk.dominantRisks,
      ),
    },
    topIssues: normalizeIssues(candidate?.topIssues, base.topIssues),
    priorityFixes: normalizeFixes(candidate?.priorityFixes, base.priorityFixes),
    quickWins: normalizeStringArray(candidate?.quickWins, 6, base.quickWins),
    strengths: normalizeStringArray(candidate?.strengths, 5, base.strengths),
    nextMilestones: normalizeStringArray(
      candidate?.nextMilestones,
      5,
      base.nextMilestones,
    ),
  };
}

function mergeHybridReports(base, candidates) {
  const categoryScores = {};
  for (const key of CATEGORY_KEYS) {
    const values = candidates
      .map((item) => item.parsed?.categories?.[key])
      .filter((value) => Number.isFinite(value))
      .map((value) => clamp(Math.round(value), 0, 100));

    const aiAverage = values.length ? Math.round(average(values)) : null;
    categoryScores[key] =
      aiAverage === null
        ? base.categories[key]
        : blendScore(base.categories[key], aiAverage);
  }

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

  const riskValues = candidates
    .map((item) => item.parsed?.risk?.score)
    .filter((value) => Number.isFinite(value))
    .map((value) => clamp(Math.round(value), 0, 100));

  const aiRiskAverage = riskValues.length ? Math.round(average(riskValues)) : null;
  const riskScore =
    aiRiskAverage === null
      ? base.risk.score
      : blendScore(base.risk.score, aiRiskAverage);

  const riskVotes = candidates
    .map((item) => sanitizeRiskLevel(item.parsed?.risk?.level))
    .filter(Boolean);

  const riskLevel = mostFrequent(riskVotes) || deriveRiskLevel(riskScore);
  const dominantRisks = uniqueStrings([
    ...(base.risk.dominantRisks || []),
    ...candidates.flatMap((item) =>
      normalizeStringArray(item.parsed?.risk?.dominantRisks, 6, []),
    ),
  ]).slice(0, 4);

  const candidateSummaries = candidates
    .map((item) => sanitizeText(item.parsed?.summary))
    .filter(Boolean);

  return {
    ...base,
    summary: buildConsensusSummary(candidateSummaries, base.summary),
    categories: categoryScores,
    overallScore,
    grade: deriveGrade(overallScore),
    risk: {
      score: riskScore,
      level: riskLevel,
      dominantRisks,
    },
    topIssues: mergeIssueSets(base, candidates),
    priorityFixes: mergeFixSets(base, candidates),
    quickWins: uniqueStrings([
      ...(base.quickWins || []),
      ...candidates.flatMap((item) =>
        normalizeStringArray(item.parsed?.quickWins, 6, []),
      ),
    ]).slice(0, 6),
    strengths: uniqueStrings([
      ...(base.strengths || []),
      ...candidates.flatMap((item) =>
        normalizeStringArray(item.parsed?.strengths, 6, []),
      ),
    ]).slice(0, 5),
    nextMilestones: uniqueStrings([
      ...(base.nextMilestones || []),
      ...candidates.flatMap((item) =>
        normalizeStringArray(item.parsed?.nextMilestones, 6, []),
      ),
    ]).slice(0, 5),
  };
}

function mergeIssueSets(base, candidates) {
  const combined = [
    ...(base.topIssues || []),
    ...candidates.flatMap((item) => normalizeIssues(item.parsed?.topIssues, [])),
  ];

  const deduped = dedupeBy(combined, (issue) => {
    const file = sanitizeText(issue.file) || 'Unknown file';
    const title = sanitizeText(issue.title) || 'Untitled issue';
    return `${file}::${title}`;
  });

  const sorted = deduped
    .map((issue) => ({
      file: sanitizeText(issue.file) || 'Unknown file',
      title: sanitizeText(issue.title) || 'Untitled issue',
      description: sanitizeText(issue.description) || 'No description provided.',
      severity: sanitizeSeverity(issue.severity),
      recommendation:
        sanitizeText(issue.recommendation) ||
        'Review this issue and implement an explicit fix.',
    }))
    .sort((a, b) => {
      const severityDelta = (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
      if (severityDelta !== 0) return severityDelta;
      return a.file.localeCompare(b.file, 'en');
    })
    .slice(0, 12);

  return sorted.length ? sorted : base.topIssues;
}

function mergeFixSets(base, candidates) {
  const combined = [
    ...(base.priorityFixes || []),
    ...candidates.flatMap((item) => normalizeFixes(item.parsed?.priorityFixes, [])),
  ];

  const deduped = dedupeBy(combined, (fix) => {
    const file = sanitizeText(fix.file) || 'Unknown file';
    const suggestion = sanitizeText(fix.suggestion) || 'General improvement';
    return `${file}::${suggestion}`;
  });

  const sorted = deduped
    .map((fix) => ({
      file: sanitizeText(fix.file) || 'Unknown file',
      suggestion:
        sanitizeText(fix.suggestion) || 'Implement targeted quality improvement.',
      impact: sanitizeImpact(fix.impact),
      effort: sanitizeEffort(fix.effort),
      rationale:
        sanitizeText(fix.rationale) || 'Improves quality, resilience, or security.',
    }))
    .sort((a, b) => {
      const impactDelta = (IMPACT_RANK[b.impact] || 0) - (IMPACT_RANK[a.impact] || 0);
      if (impactDelta !== 0) return impactDelta;
      const effortDelta = (EFFORT_RANK[b.effort] || 0) - (EFFORT_RANK[a.effort] || 0);
      if (effortDelta !== 0) return effortDelta;
      return a.file.localeCompare(b.file, 'en');
    })
    .slice(0, 6);

  return sorted.length ? sorted : base.priorityFixes;
}

function buildConsensusSummary(candidateSummaries, fallback) {
  const unique = uniqueStrings(candidateSummaries);
  if (!unique.length) return fallback;
  if (unique.length === 1) return unique[0];
  return `${unique[0]} Consensus view: ${unique[1]}`;
}

function buildFailureReason(failures, prefix) {
  if (!failures.length) return null;

  const details = failures
    .map((failure) => extractErrorMessage(failure))
    .filter(Boolean);

  if (!details.length) return prefix;
  return `${prefix} ${details.join(' | ')}`;
}

function extractErrorMessage(error) {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error.message === 'string') return error.message;
  return null;
}

function normalizeIssues(issues, fallback) {
  if (!Array.isArray(issues) || !issues.length) return fallback;

  const normalized = issues
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      file: sanitizeText(item.file) || 'Unknown file',
      title: sanitizeText(item.title) || 'Untitled issue',
      description: sanitizeText(item.description) || 'No description provided.',
      severity: sanitizeSeverity(item.severity),
      recommendation:
        sanitizeText(item.recommendation) ||
        'Review this issue and implement an explicit fix.',
    }))
    .slice(0, 12);

  return normalized.length ? normalized : fallback;
}

function normalizeFixes(fixes, fallback) {
  if (!Array.isArray(fixes) || !fixes.length) return fallback;

  const normalized = fixes
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      file: sanitizeText(item.file) || 'Unknown file',
      suggestion:
        sanitizeText(item.suggestion) || 'Implement targeted quality improvement.',
      impact: sanitizeImpact(item.impact),
      effort: sanitizeEffort(item.effort),
      rationale:
        sanitizeText(item.rationale) || 'Improves quality, resilience, or security.',
    }))
    .slice(0, 6);

  return normalized.length ? normalized : fallback;
}

function normalizeStringArray(candidate, limit, fallback) {
  if (!Array.isArray(candidate) || !candidate.length) return fallback;

  const normalized = candidate
    .map((item) => sanitizeText(item))
    .filter(Boolean)
    .slice(0, limit);

  return normalized.length ? normalized : fallback;
}

function sanitizeSeverity(value) {
  const normalized = sanitizeText(value);
  if (['Critical', 'High', 'Medium', 'Low'].includes(normalized)) {
    return normalized;
  }
  return 'Medium';
}

function sanitizeImpact(value) {
  const normalized = sanitizeText(value);
  return normalized === 'High' ? 'High' : 'Medium';
}

function sanitizeEffort(value) {
  const normalized = sanitizeText(value);
  if (['Low', 'Medium', 'High'].includes(normalized)) {
    return normalized;
  }
  return 'Medium';
}

function sanitizeRiskLevel(value) {
  const normalized = sanitizeText(value);
  if (['Low', 'Moderate', 'Elevated', 'Critical'].includes(normalized)) {
    return normalized;
  }
  return null;
}

function sanitizeText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function withMeta(
  report,
  {
    provider,
    model,
    fallbackUsed,
    fallbackReason,
  },
) {
  return {
    ...report,
    analysisMeta: {
      ...report.analysisMeta,
      provider,
      model,
      fallbackUsed,
      fallbackReason,
      stabilityMode: 'anchored',
      scoreWeights: {
        local: SCORE_BASE_WEIGHT,
        ai: SCORE_AI_WEIGHT,
      },
    },
  };
}

function dedupeBy(items, getKey) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function uniqueStrings(items) {
  const normalized = items
    .map((item) => sanitizeText(item))
    .filter(Boolean);

  return dedupeBy(normalized, (item) => item.toLowerCase());
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mostFrequent(values) {
  if (!values.length) return null;

  const counter = new Map();
  for (const value of values) {
    counter.set(value, (counter.get(value) || 0) + 1);
  }

  let winner = null;
  let max = -1;
  for (const [value, count] of counter.entries()) {
    if (count > max) {
      max = count;
      winner = value;
    }
  }

  return winner;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function blendScore(baseScore, aiScore) {
  const base = Number.isFinite(baseScore) ? baseScore : aiScore;
  const ai = Number.isFinite(aiScore) ? aiScore : baseScore;
  return clamp(
    Math.round(base * SCORE_BASE_WEIGHT + ai * SCORE_AI_WEIGHT),
    0,
    100,
  );
}

function parseWeight(raw, fallback) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, 0.5, 0.95);
}
