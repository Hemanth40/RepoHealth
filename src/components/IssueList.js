export default function IssueList({ issues }) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return <p className="muted">No critical issues found in analyzed files.</p>;
  }

  return (
    <div className="issue-list">
      {issues.slice(0, 12).map((issue) => (
        <article className="issue-item" key={`${issue.file}:${issue.title}`}>
          <header className="issue-header">
            <h3>{issue.title}</h3>
            <span className={`tag tag-severity-${severityTone(issue.severity)}`}>
              {issue.severity || 'Medium'}
            </span>
          </header>
          <p className="muted">{issue.description}</p>
          <p className="mono">{issue.file}</p>
          {issue.recommendation ? (
            <p className="issue-recommendation">Fix: {issue.recommendation}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function severityTone(value) {
  if (value === 'Critical') return 'critical';
  if (value === 'High') return 'high';
  if (value === 'Low') return 'low';
  return 'medium';
}
