import dotenv from "dotenv";

// Auto-load .env for tests that need real API keys (e.g. real-Gemini
// integration tests). Silently does nothing if .env doesn't exist.
dotenv.config({ quiet: true });
