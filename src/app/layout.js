import './globals.css';

export const metadata = {
    title: 'AI RepoHealth - 30s Code Doctor',
    description: 'Analyze your codebase health in seconds using AI.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
