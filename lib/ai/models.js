/**
 * Model registry — the single source of truth for the models selectable in the
 * widget editor and validated server-side before a generate call.
 *
 * `id` is the Vercel AI Gateway model string ("provider/model") and doubles as a
 * stable key for the UI <select>. `provider` + `model` are stored separately on
 * prompt_versions so the engine can rebuild the gateway string. Routing happens
 * through the Vercel AI Gateway (BYOK) — no per-token markup.
 *
 * Keep this list in sync with the live catalog at
 * https://vercel.com/ai-gateway/models (ids verified June 2026).
 *
 * This module is safe to import in client code — it has no server-only deps.
 */

export const PROVIDERS = ['openai', 'anthropic', 'google'];

export const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
};

export const MODELS = [
  // OpenAI — GPT-5 series (gpt-4o is being phased out on the Gateway)
  { id: 'openai/gpt-5.5', provider: 'openai', model: 'gpt-5.5', label: 'OpenAI · GPT-5.5', vision: true },
  { id: 'openai/gpt-5.4', provider: 'openai', model: 'gpt-5.4', label: 'OpenAI · GPT-5.4', vision: true },

  // Anthropic Claude
  { id: 'anthropic/claude-opus-4.8',   provider: 'anthropic', model: 'claude-opus-4.8',   label: 'Anthropic · Claude Opus 4.8',   vision: true },
  { id: 'anthropic/claude-sonnet-4.6', provider: 'anthropic', model: 'claude-sonnet-4.6', label: 'Anthropic · Claude Sonnet 4.6', vision: true },
  { id: 'anthropic/claude-haiku-4.5',  provider: 'anthropic', model: 'claude-haiku-4.5',  label: 'Anthropic · Claude Haiku 4.5',  vision: true, default: true },

  // Google Gemini
  { id: 'google/gemini-2.5-pro',   provider: 'google', model: 'gemini-2.5-pro',   label: 'Google · Gemini 2.5 Pro',   vision: true },
  { id: 'google/gemini-2.5-flash', provider: 'google', model: 'gemini-2.5-flash', label: 'Google · Gemini 2.5 Flash', vision: true },
  { id: 'google/gemini-3.5-flash', provider: 'google', model: 'gemini-3.5-flash', label: 'Google · Gemini 3.5 Flash', vision: true },
];

/** The default model used when a prompt is created without an explicit choice. */
export const DEFAULT_MODEL = MODELS.find((m) => m.default) || MODELS[0];

/**
 * Embedding model for the RAG knowledge base. Routed through the AI Gateway as a
 * bare "provider/model" string, exactly like the chat models above.
 *
 * IMPORTANT: EMBEDDING_DIMENSIONS is the source of truth for the pgvector column
 * width (`document_chunks.embedding vector(1536)`, migration 0010). Changing the
 * model to one with a different dimension requires a new migration + re-embedding
 * every existing chunk — it is not a hot-swap.
 */
export const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

/** Build the AI Gateway "provider/model" string the AI SDK expects. */
export function gatewayString(provider, model) {
  return `${provider}/${model}`;
}

/** Look up a registry entry by its gateway-string id ("provider/model"). */
export function getModelById(id) {
  return MODELS.find((m) => m.id === id) || null;
}

/** Look up a registry entry by separate provider + model fields. */
export function getModel(provider, model) {
  return MODELS.find((m) => m.provider === provider && m.model === model) || null;
}

/** Whether a (provider, model) pair is in the registry — server-side guard. */
export function isValidModel(provider, model) {
  return MODELS.some((m) => m.provider === provider && m.model === model);
}

/** Whether a model accepts image input (used to decide if we attach images). */
export function supportsVision(provider, model) {
  const m = getModel(provider, model);
  return m ? !!m.vision : false;
}
