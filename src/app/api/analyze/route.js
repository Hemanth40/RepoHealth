import { NextResponse } from 'next/server';
import { fetchRepoSnapshot } from '@/lib/github';
import { buildRepositoryReport } from '@/lib/reportBuilder';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const repoUrl = typeof body?.repoUrl === 'string' ? body.repoUrl.trim() : '';

    if (!repoUrl) {
      return NextResponse.json(
        { error: 'Repository URL (or owner/repo) is required.' },
        { status: 400 },
      );
    }

    const snapshot = await fetchRepoSnapshot(repoUrl);
    const report = await buildRepositoryReport(snapshot);

    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    const lowered = message.toLowerCase();

    let status = 500;
    if (lowered.includes('rate limit') || lowered.includes('api rate limit')) status = 429;
    if (lowered.includes('not found')) status = 404;
    if (lowered.includes('valid github')) status = 400;

    return NextResponse.json({ error: message }, { status });
  }
}
