import Heatmap from './Heatmap';
import IssueList from './IssueList';

const CATEGORY_LABELS = {
  maintainability: 'Maintainability',
  reliability: 'Reliability',
  security: 'Security',
  documentation: 'Documentation',
  architecture: 'Architecture',
};

export default function Dashboard({ data }) {
  if (!data) return null;

  const project = data.project || {};
  const risk = data.risk || {};
  const categories = data.categories || {};
  const analysisMeta = data.analysisMeta || {};
  const categoryEntries = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    key,
    label,
    score: Number.isFinite(categories[key]) ? categories[key] : 0,
  }));

  return (
    <div className="container dashboard-wrap">
      <section className="panel report-hero">
        <div className="report-main">
          <p className="eyebrow">Repository Report v{data.reportVersion || '2.0'}</p>
          <h2>{project.fullName || 'Repository'}</h2>
          <p className="muted">
            {project.description || 'No repository description provided.'}
          </p>
          <div className="project-meta">
            <span>Language: {project.primaryLanguage || 'Unknown'}</span>
            <span>Stars: {project.stars ?? 0}</span>
            <span>Forks: {project.forks ?? 0}</span>
            <span>Open issues: {project.openIssues ?? 0}</span>
          </div>
        </div>
        <div className="score-badge-wrap">
          <div className={`score-badge ${scoreTone(data.overallScore)}`}>
            <p>Health Score</p>
            <strong>{data.overallScore ?? 0}</strong>
            <span>Grade {data.grade || 'N/A'}</span>
          </div>
          <div className="confidence-box">
            <p>Confidence</p>
            <strong>{data.confidence ?? 0}%</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Executive Summary</h2>
        <p className="muted">{data.summary}</p>
      </section>

      <div className="meta-grid">
        <section className="panel">
          <h2>Category Scores</h2>
          <div className="category-list">
            {categoryEntries.map((entry) => (
              <div key={entry.key} className="category-row">
                <div className="category-label-row">
                  <span>{entry.label}</span>
                  <strong>{entry.score}</strong>
                </div>
                <div className="category-track">
                  <div
                    className={`category-fill ${scoreTone(entry.score)}`}
                    style={{ width: `${entry.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Risk Posture</h2>
          <div className={`risk-pill risk-${(risk.level || 'Moderate').toLowerCase()}`}>
            {risk.level || 'Moderate'} Risk
          </div>
          <p className="muted">Risk score: {risk.score ?? 0}/100</p>
          <ul className="simple-list">
            {(risk.dominantRisks || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Analysis Runtime</h2>
          <ul className="simple-list">
            <li>Provider: {analysisMeta.provider || 'local-heuristics'}</li>
            <li>Model: {analysisMeta.model || 'rule-engine-v2'}</li>
            {analysisMeta.stabilityMode ? <li>Stability mode: {analysisMeta.stabilityMode}</li> : null}
            {analysisMeta.scoreWeights ? (
              <li>
                Score blend: Local {Math.round((analysisMeta.scoreWeights.local || 0) * 100)}% + AI{' '}
                {Math.round((analysisMeta.scoreWeights.ai || 0) * 100)}%
              </li>
            ) : null}
            <li>Files analyzed: {analysisMeta.filesAnalyzed ?? 0}</li>
            <li>Estimated LOC: {analysisMeta.estimatedLoc ?? 0}</li>
            {analysisMeta.fallbackUsed ? (
              <li>Fallback mode active: {analysisMeta.fallbackReason || 'Provider unavailable'}</li>
            ) : null}
          </ul>
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <h2>Complexity Heatmap</h2>
          <Heatmap data={data.heatmap} />
        </section>

        <section className="panel">
          <h2>Top Issues</h2>
          <IssueList issues={data.topIssues} />
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <h2>Priority Fixes</h2>
          <div className="fixes-list">
            {(data.priorityFixes || []).map((fix) => (
              <article className="fix-item" key={`${fix.file}:${fix.suggestion}`}>
                <header>
                  <h3>{fix.suggestion}</h3>
                  <span className="mono">{fix.file}</span>
                </header>
                <p className="muted">{fix.rationale || 'Targeted quality improvement.'}</p>
                <div className="badge-row">
                  <span className={`tag tag-impact-${(fix.impact || 'Medium').toLowerCase()}`}>
                    {fix.impact || 'Medium'} impact
                  </span>
                  <span className={`tag tag-effort-${(fix.effort || 'Medium').toLowerCase()}`}>
                    {fix.effort || 'Medium'} effort
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Quick Wins & Strengths</h2>
          <h3>Quick Wins</h3>
          <ul className="simple-list">
            {(data.quickWins || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className="subhead">Current Strengths</h3>
          <ul className="simple-list">
            {(data.strengths || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Next Milestones</h2>
        <ul className="milestone-list">
          {(data.nextMilestones || []).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function scoreTone(score) {
  if (score >= 82) return 'tone-good';
  if (score >= 65) return 'tone-mid';
  return 'tone-risk';
}
