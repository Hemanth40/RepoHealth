import React from 'react';
import Heatmap from './Heatmap';
import IssueList from './IssueList';

export default function Dashboard({ data }) {
    if (!data) return null;

    const { overallScore, summary, heatmap, topIssues, priorityFixes, quickWins } = data;

    const getScoreColor = (score) => {
        if (score >= 80) return 'score-high';
        if (score >= 60) return 'score-med';
        return 'score-low';
    };

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
            {/* Header Section */}
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }}></div>

                <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Health Report</h1>
                <div className="score-card animate-float">
                    <div className={`score-circle ${getScoreColor(overallScore)}`} style={{
                        borderColor: overallScore >= 80 ? 'var(--success)' : overallScore >= 60 ? 'var(--warning)' : 'var(--danger)',
                        color: overallScore >= 80 ? 'var(--success)' : overallScore >= 60 ? 'var(--warning)' : 'var(--danger)',
                        boxShadow: `0 0 30px ${overallScore >= 80 ? 'rgba(34, 197, 94, 0.3)' : overallScore >= 60 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                        {overallScore}
                    </div>
                </div>
                <p style={{ fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto', opacity: 0.9, lineHeight: 1.6 }}>{summary}</p>
            </div>

            {/* Grid Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--accent)' }}>◈</span> Complexity Heatmap
                    </h2>
                    <Heatmap data={heatmap} />
                </div>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--danger)' }}>⚠</span> Top Issues
                    </h2>
                    <IssueList issues={topIssues} />
                </div>
            </div>

            {/* Fixes & Quick Wins */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--warning)' }}>⚡</span> Priority Fixes
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {priorityFixes && priorityFixes.map((fix, i) => (
                            <div key={i} className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: 'none' }}>
                                <h3 style={{ color: 'var(--foreground)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{fix.suggestion}</h3>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                                    <span style={{ opacity: 0.7 }}>{fix.file}</span>
                                    <span className={`badge badge-${fix.impact}`}>{fix.impact} Impact</span>
                                    <span className={`badge badge-${fix.effort}`}>{fix.effort} Effort</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--success)' }}>✨</span> Quick Wins
                    </h2>
                    <ul style={{ listStyle: 'none' }}>
                        {quickWins && quickWins.map((win, i) => (
                            <li key={i} style={{
                                padding: '1rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                fontSize: '1.05rem'
                            }}>
                                <div style={{
                                    minWidth: '24px', height: '24px',
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--success)'
                                }}>✓</div>
                                {win}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
