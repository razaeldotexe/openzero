import 'dotenv/config';

export const config = {
    githubRepoUrl: 'https://github.com/razaeldotexe/openzero-resource',
    githubRepoOwner: 'razaeldotexe',
    githubRepoName: 'openzero-resource',
    githubToken: process.env.GITHUB_TOKEN,
    geminiApiKey: process.env.GEMINI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    apiUrl: process.env.API_URL || 'http://localhost:8080',
};
