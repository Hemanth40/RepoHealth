export default function IssueList({ issues, embedded = false }) {
    if (!issues || issues.length === 0) return <p>No critical issues found.</p>;

    return (
        <div className="issue-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {issues.map((issue, index) => (
                <div key={index} className="issue-item" style={{
                    border: 'none',
                    background: embedded ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    padding: '1rem',
                    borderLeft: `3px solid ${issue.severity === 'Critical' ? 'var(--danger)' :
                            issue.severity === 'High' ? 'orange' :
                                'var(--warning)'
                        }`
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: '600' }}>{issue.title}</h3>
                        {!embedded && <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>}
                    </div>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.5, opacity: 0.8 }}>{issue.description}</p>
                    <div style={{ fontSize: '0.8rem', opacity: 0.5, fontFamily: 'monospace', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span>📄 {issue.file}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
