// Unit/contract tests never consume developer credentials or make paid calls.
process.env.SCIENCEX_SKIP_ENV_FILE = 'true';
process.env.DEEPSEEK_API_KEY = '';
process.env.OPENAI_API_KEY = '';
process.env.EMBEDDING_BASE_URL = '';
process.env.AI_RETRY_BASE_MS = '1';
