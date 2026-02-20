export default function Heatmap({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="muted">No file-level complexity data available.</p>;
  }

  const rows = [...data]
    .sort((a, b) => b.complexityScore - a.complexityScore)
    .slice(0, 18);

  return (
    <div className="heatmap-list">
      {rows.map((entry) => (
        <article className="heatmap-item" key={`${entry.file}:${entry.complexityScore}`}>
          <div className={`heat-score ${tone(entry.complexityScore)}`}>
            {entry.complexityScore}
          </div>
          <div className="heat-content">
            <p className="mono">{entry.file}</p>
            <div className="heat-track">
              <div
                className={`heat-fill ${tone(entry.complexityScore)}`}
                style={{ width: `${Math.min(entry.complexityScore * 10, 100)}%` }}
              />
            </div>
          </div>
          <div className="heat-meta">
            <span>{entry.loc || 0} LOC</span>
            <span>{entry.issues || 0} issues</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function tone(score) {
  if (score >= 8) return 'tone-risk';
  if (score >= 5) return 'tone-mid';
  return 'tone-good';
}
