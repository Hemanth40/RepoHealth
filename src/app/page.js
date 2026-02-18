'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';

export default function Home() {
    const [repoUrl, setRepoUrl] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [loadingStep, setLoadingStep] = useState(0);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const loadingSteps = [
        "Connecting to GitHub API...",
        "Fetching repository files...",
        "Filtering relevant code...",
        "Analyzing with Groq AI...",
        "Generating health report..."
    ];

    const handleAnalyze = async () => {
        if (!repoUrl) return;

        setStatus('loading');
        setLoadingStep(0);
        setError(null);

        // Simulate progress for the first few steps
        const interval = setInterval(() => {
            setLoadingStep(prev => (prev < 4 ? prev + 1 : prev));
        }, 1500);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl }),
            });

            const result = await response.json();

            clearInterval(interval);

            if (!response.ok) {
                throw new Error(result.error || 'Failed to analyze repository');
            }

            setData(result);
            setStatus('success');
        } catch (err) {
            clearInterval(interval);
            setError(err.message);
            setStatus('error');
        }
    };

    return (
        <main className="min-h-screen" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="cyber-grid"></div>
            {/* Background Orbs */}
            <div style={{ position: 'fixed', top: '10%', left: '10%', width: '400px', height: '400px', background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.2, borderRadius: '50%', zIndex: -1 }}></div>
            <div style={{ position: 'fixed', bottom: '10%', right: '10%', width: '300px', height: '300px', background: 'var(--accent)', filter: 'blur(150px)', opacity: 0.2, borderRadius: '50%', zIndex: -1 }}></div>

            {/* Hero Section */}
            {status === 'idle' && (
                <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', textAlign: 'center', padding: '1rem' }}>
                    <div className="animate-fade-in delay-100">
                        <span style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: 'var(--primary)',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}>
                            AI-Powered Code Analysis
                        </span>
                    </div>

                    <h1 className="animate-fade-in delay-200" style={{ marginTop: '1.5rem' }}>
                        Repo<span style={{ color: 'var(--primary)' }}>Health</span> Check
                    </h1>

                    <p className="animate-fade-in delay-300" style={{ fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '600px', opacity: 0.7, lineHeight: 1.6 }}>
                        Instant, AI-driven insights for your codebase. <br />
                        Identify complexity, bugs, and quick wins in seconds.
                    </p>

                    <div className="animate-fade-in delay-300 glass-panel" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '500px', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Paste GitHub URL (e.g., username/repo)"
                            className="glass-input"
                            style={{ border: 'none', background: 'transparent' }}
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                        />
                        <button onClick={handleAnalyze} className="btn-primary" disabled={!repoUrl}>
                            Analyze
                        </button>
                    </div>

                    <div className="animate-fade-in delay-300" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>Popular Repos:</span>
                        <button onClick={() => setRepoUrl('https://github.com/facebook/react')} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>React</button>
                        <button onClick={() => setRepoUrl('https://github.com/vercel/next.js')} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>Next.js</button>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {status === 'loading' && (
                <div className="flex-center animate-fade-in" style={{ minHeight: '100vh', flexDirection: 'column' }}>
                    <div className="glass-panel" style={{ padding: '3rem', minWidth: '400px', textAlign: 'center' }}>
                        <div className="animate-float" style={{
                            width: 80, height: 80,
                            border: '4px solid rgba(59, 130, 246, 0.1)',
                            borderTop: '4px solid var(--primary)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 2rem auto',
                            boxShadow: '0 0 20px var(--primary-glow)'
                        }}></div>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

                        {loadingSteps.map((step, index) => (
                            <div key={index} className={`loading-step ${index === loadingStep ? 'active' : ''}`}
                                style={{ opacity: index === loadingStep ? 1 : index < loadingStep ? 0.4 : 0.1, justifyContent: 'center' }}>
                                {index < loadingStep ? <span style={{ color: 'var(--success)' }}>✓</span> : ''} {step}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error State */}
            {status === 'error' && (
                <div className="flex-center animate-fade-in" style={{ minHeight: '100vh', flexDirection: 'column' }}>
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', border: '1px solid var(--danger)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Analysis Failed</h2>
                        <p style={{ marginBottom: '2rem', maxWidth: '400px', opacity: 0.8 }}>{error}</p>
                        <button onClick={() => setStatus('idle')} className="btn-primary">Try Again</button>
                    </div>
                </div>
            )}

            {/* Results Dashboard */}
            {status === 'success' && data && (
                <div className="animate-fade-in" style={{ paddingTop: '2rem' }}>
                    <div className="container" style={{ marginBottom: '1rem' }}>
                        <button onClick={() => setStatus('idle')} style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--foreground)',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            backdropFilter: 'blur(4px)'
                        }}>
                            ← Analyze another repo
                        </button>
                    </div>
                    <Dashboard data={data} />
                </div>
            )}
        </main>
    );
}
