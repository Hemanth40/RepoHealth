import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function analyzeCode(files) {
  console.log("analyzeCode started with", files.length, "files");
  try {
    const fileContext = files.map(f => `
--- FILE: ${f.path} ---
${f.content}
`).join('\n');

    console.log("Context prepared, length:", fileContext.length);

    const prompt = `
You are a Senior Principal Software Engineer and Code Quality Architect. 
Your task is to analyze the following codebase files and generate a comprehensive health report.
Review the code for:
1. **Complexity**: Cyclomatic complexity, nested loops, deep branching.
2. **Key Issues**: Bugs, race conditions, security vulnerabilities, anti-patterns, poor error handling.
3. **Best Practices**: Naming conventions, modularity, DRY principle, modern language features.
4. **Documentation**: Presence and quality of comments/docstrings.

**Output Format**:
Return ONLY a valid JSON object with the following structure. Do not include markdown code blocks or any text outside the JSON.

{
  "overallScore": <number 0-100>,
  "summary": "<short executive summary of the codebase health>",
  "categories": {
    "complexity": <number 0-100>,
    "documentation": <number 0-100>,
    "bestPractices": <number 0-100>,
    "security": <number 0-100>
  },
  "heatmap": [
    {
      "file": "<filename>",
      "complexityScore": <number 0-10 (10 is very complex)>,
      "issues": <count of issues found>
    },
    ...
  ],
  "topIssues": [
    {
      "file": "<filename>",
      "title": "<short issue title>",
      "description": "<plain english explanation>",
      "severity": "<Critical|High|Medium|Low>"
    },
    ... (max 10 issues)
  ],
  "priorityFixes": [
    {
      "file": "<filename>",
      "suggestion": "<what to fix>",
      "impact": "<High|Medium>",
      "effort": "<Low|Medium|High>"
    },
     ... (max 5 fixes)
  ],
  "quickWins": [
      "<simple fix 1>",
      "<simple fix 2>"
  ]
}

**CODE TO ANALYZE**:
${fileContext}
`;

    console.log("Sending request to Groq...");
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert code analyst. output only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile", // Using supported model
      temperature: 0.2, // Low temperature for consistent output
    });

    console.log("Groq response received");
    const content = completion.choices[0]?.message?.content || "{}";
    // Extract JSON from markdown code block if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Groq Analysis Error:", error);
    throw new Error("Failed to analyze code with AI: " + error.message);
  }
}
