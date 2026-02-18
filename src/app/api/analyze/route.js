import { NextResponse } from 'next/server';
import { fetchRepoContent } from '@/lib/github';
import { analyzeCode } from '@/lib/groq';

export async function POST(request) {
    try {
        const body = await request.json();
        const { repoUrl } = body;

        if (!repoUrl) {
            return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
        }

        // 1. Fetch Code
        console.log("Fetching code implementation...");
        let files;
        try {
            files = await fetchRepoContent(repoUrl);
        } catch (err) {
            console.error("GitHub fetch failed:", err);

            // Explicitly handle rate limits
            if (err.status === 403 || err.message.toLowerCase().includes("quota")) {
                return NextResponse.json({
                    error: 'GitHub API rate limit exceeded. Please add a GITHUB_TOKEN to your .env.local file.'
                }, { status: 403 });
            }
            throw err;
        }

        if (files.length === 0) {
            return NextResponse.json({ error: 'No relevant code files found or repository is empty.' }, { status: 404 });
        }

        // 2. Analyze with AI
        console.log(`Analyzing ${files.length} files...`);
        const analysis = await analyzeCode(files);

        return NextResponse.json(analysis);

    } catch (error) {
        console.error("API Error Detailed:", error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            stack: error.stack
        }, { status: 500 });
    }
}
