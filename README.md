# 🩺 AI RepoHealth

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black)
![Groq](https://img.shields.io/badge/AI-Groq-orange)
![Status](https://img.shields.io/badge/Status-Active-success)

> **"Check your code's vital signs in 30 seconds."**

**AI RepoHealth** is a modern, AI-powered web application that provides instant, actionable health reports for GitHub repositories. By leveraging the speed of Groq AI and the flexibility of Next.js, it analyzes code complexity, identifies critical bugs, and suggests priority fixes—all wrapped in a futuristic, glassmorphism UI.

---

## ✨ Key Features

- **🚀 Instant Analysis**: Fetches and analyzes GitHub repositories in seconds.
- **🧠 Advanced AI Engine**: Powered by **Groq (Llama-3.3-70b)** for deep code understanding.
- **🎨 Modern 2026 UI**:
    - **Glassmorphism Design**: Sleek, translucent panels and vibrant gradients.
    - **Cyber Grid Background**: Dynamic, animated 3D grid effect.
    - **Micro-interactions**: Smooth hover states and transitions.
- **📊 Interactive Dashboard**:
    - **Health Score**: Overall code quality rating (0-100).
    - **Complexity Heatmap**: Interactive visualizer for file complexity.
    - **Critical Issues**: Prioritized list of bugs and anti-patterns.
    - **Priority Fixes**: AI-suggested refactors with effort/impact estimation.
    - **Quick Wins**: Low-effort tasks to immediately improve code quality.

---

## 🛠️ Technology Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), React 19
- **Styling**: Vanilla CSS (Variables, Keyframes, Glassmorphism)
- **AI Backend**: [Groq SDK](https://wow.groq.com/) (Llama 3.3 70B Versatile)
- **Data Fetching**: [Octokit](https://github.com/octokit/octokit.js) (GitHub API)
- **Environment**: Node.js

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- Node.js 18+ installed.
- A [Groq API Key](https://console.groq.com/).
- A [GitHub Personal Access Token](https://github.com/settings/tokens) (optional, but recommended for higher rate limits).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/repo-health.git
    cd repo-health
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory:
    ```bash
    GROQ_API_KEY=your_groq_api_key_here
    GITHUB_TOKEN=your_github_token_here
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open the app:**
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/analyze/    # API Route for GitHub fetching & AI Analysis
│   │   ├── globals.css     # Global styles, variables, and animations
│   │   ├── layout.js       # Root layout
│   │   └── page.js         # Main Landing Page (Hero + Logic)
│   ├── components/
│   │   ├── Dashboard.js    # Main Results Container (Glass Panel)
│   │   ├── Heatmap.js      # Interactive Complexity Visualizer
│   │   └── IssueList.js    # Issues & Fixes Display
│   └── lib/
│       ├── github.js       # GitHub API integration (Octokit)
│       └── groq.js         # Groq AI prompt engineering & client
├── .env.local              # Environment secrets (Git-ignored)
├── package.json            # Dependencies & Scripts
└── README.md               # Project Documentation
```

---

## 🛡️ API Reference

### `POST /api/analyze`

Analyzes a public GitHub repository.

**Request Body:**
```json
{
  "repoUrl": "https://github.com/username/repository"
}
```

**Response:**
```json
{
  "overallScore": 85,
  "summary": "Solid codebase with...",
  "heatmap": [...],
  "topIssues": [...],
  "priorityFixes": [...]
}
```

---

## 🔮 Roadmap

- [ ] Support for private repositories (OAuth).
- [ ] Export reports to PDF/Markdown.
- [ ] Historical health tracking (Chart.js integration).
- [ ] VS Code Extension.

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any features or bug fixes.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by <b>RepoHealth Team</b>
</p>
