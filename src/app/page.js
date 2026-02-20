'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';

const LOADING_STEPS = [
  'Connecting to GitHub repository data...',
  'Sampling source files and metadata...',
  'Running deterministic quality heuristics...',
  'Enhancing insights with selected AI provider...',
  'Assembling RepoSentinelX 2.0 report...',
];

const SAMPLE_REPOS = [
  'vercel/next.js',
  'facebook/react',
  'microsoft/TypeScript',
];

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [status, setStatus] = useState('idle');
  const [loadingStep, setLoadingStep] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const canAnalyze = Boolean(repoUrl.trim()) && status !== 'loading';

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return;

    setStatus('loading');
    setLoadingStep(0);
    setError('');

    const interval = setInterval(() => {
      setLoadingStep((previous) =>
        previous < LOADING_STEPS.length - 1 ? previous + 1 : previous,
      );
    }, 1400);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed. Please try another repository.');
      }

      setData(result);
      setStatus('success');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unknown error');
      setStatus('error');
    } finally {
      clearInterval(interval);
    }
  };

  const resetToIdle = () => {
    setStatus('idle');
    setData(null);
    setError('');
    setLoadingStep(0);
  };

  return (
    <main className="app-shell">
      <div className="ambient-canvas">
        <div className="ambient-orb orb-one" />
        <div className="ambient-orb orb-two" />
        <div className="grid-overlay" />
      </div>

      {status !== 'success' && (
        <section className="hero-section">
          <div className="hero-content reveal-up">
            <p className="eyebrow">RepoSentinelX 2.0</p>
            <h1>Advanced GitHub Repository Health Intelligence</h1>
            <p className="hero-subtitle">
              A fully free, production-grade analyzer powered by GitHub APIs,
              deterministic quality heuristics, and optional Gemini/Groq AI enhancement.
            </p>

            <div className="search-shell">
              <input
                type="text"
                className="repo-input"
                value={repoUrl}
                onChange={(event) => setRepoUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAnalyze();
                }}
                placeholder="Paste GitHub URL or owner/repo"
              />
              <button className="primary-button" onClick={handleAnalyze} disabled={!canAnalyze}>
                Analyze Now
              </button>
            </div>

            <div className="sample-row">
              <span>Try:</span>
              {SAMPLE_REPOS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="sample-pill"
                  onClick={() => setRepoUrl(sample)}
                >
                  {sample}
                </button>
              ))}
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <h3>Provider Fallback</h3>
                <p>Use Gemini free tier first, then Groq, with local rule-engine backup.</p>
              </article>
              <article className="feature-card">
                <h3>Richer Signals</h3>
                <p>Category scoring, risk level, heatmap, priority fixes, and milestones.</p>
              </article>
              <article className="feature-card">
                <h3>Professional UX</h3>
                <p>Structured report layout optimized for engineering leadership reviews.</p>
              </article>
            </div>
          </div>
        </section>
      )}

      {status === 'loading' && (
        <section className="state-shell">
          <div className="state-card reveal-up">
            <div className="spinner" aria-hidden />
            <h2>Running Deep Analysis</h2>
            <p>Building a complete v2 intelligence report for your repository.</p>
            <div className="progress-list">
              {LOADING_STEPS.map((step, index) => (
                <div
                  key={step}
                  className={`progress-item ${
                    index === loadingStep ? 'active' : ''
                  } ${index < loadingStep ? 'done' : ''}`}
                >
                  <span className="progress-dot" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {status === 'error' && (
        <section className="state-shell">
          <div className="state-card error-card reveal-up">
            <h2>Analysis Failed</h2>
            <p>{error}</p>
            <button className="primary-button" onClick={resetToIdle}>
              Try Another Repository
            </button>
          </div>
        </section>
      )}

      {status === 'success' && data && (
        <section className="report-section reveal-up">
          <div className="container">
            <button type="button" className="ghost-button" onClick={resetToIdle}>
              Analyze Another Repository
            </button>
          </div>
          <Dashboard data={data} />
        </section>
      )}
    </main>
  );
}
