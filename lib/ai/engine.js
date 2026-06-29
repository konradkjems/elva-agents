/**
 * Provider-agnostic chat engine built on the Vercel AI SDK (v7) + AI Gateway.
 *
 * Models are addressed by plain "provider/model" strings, which the AI SDK routes
 * through the Vercel AI Gateway (auth via AI_GATEWAY_API_KEY; provider keys are
 * BYOK in the Gateway dashboard). This powers the in-platform chat path only —
 * the legacy OpenAI-hosted (`pmpt_…`) and Chat Completions paths are untouched.
 */

import { streamText, generateText } from 'ai';
import { gatewayString, supportsVision } from './models';

function toImageUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null; // not an absolute URL — skip rather than throw
  }
}

/**
 * Map stored conversation.messages[] to AI SDK ModelMessages.
 *
 * Stored shape (respond-stream.js): { type: 'user' | 'assistant' | 'bot', content, imageUrl }.
 * User turns carrying an image become multimodal content parts, but only when the
 * target model supports vision (pass { provider, model } to enable that check).
 */
export function toAiMessages(messages, { provider, model } = {}) {
  const vision = provider && model ? supportsVision(provider, model) : false;
  return (messages || [])
    .filter((m) => m && (m.type === 'user' || m.type === 'assistant' || m.type === 'bot'))
    .filter((m) => (m.content && String(m.content).trim()) || m.imageUrl)
    .map((m) => {
      const role = m.type === 'user' ? 'user' : 'assistant';
      const imageUrl = role === 'user' && m.imageUrl && vision ? toImageUrl(m.imageUrl) : null;
      if (imageUrl) {
        return {
          role,
          content: [
            ...(m.content ? [{ type: 'text', text: String(m.content) }] : []),
            { type: 'image', image: imageUrl },
          ],
        };
      }
      return { role, content: String(m.content || '') };
    });
}

function buildParams({ provider, model, systemPrompt, messages, temperature, maxTokens }) {
  const params = {
    model: gatewayString(provider, model),
    messages,
  };
  if (systemPrompt) params.system = systemPrompt;
  if (temperature !== null && temperature !== undefined && temperature !== '') {
    params.temperature = Number(temperature);
  }
  if (maxTokens !== null && maxTokens !== undefined && maxTokens !== '') {
    params.maxOutputTokens = Number(maxTokens);
  }
  return params;
}

/**
 * Streaming generation. Returns the AI SDK result synchronously; consume
 * `result.textStream` (async iterable of deltas), then await `result.usage`
 * and `result.text`.
 */
export function streamChatResponse(opts) {
  return streamText(buildParams(opts));
}

/** Non-streaming generation. Returns { text, usage } (usage normalized). */
export async function generateChatResponse(opts) {
  const { text, usage } = await generateText(buildParams(opts));
  return { text, usage: normalizeUsage(usage) };
}

/**
 * Normalize AI SDK v7 usage ({ inputTokens, outputTokens, totalTokens }) to the
 * { total_tokens, prompt_tokens, completion_tokens } shape the rest of the app
 * already stores on messages/analytics. Tolerant of v4 field names too.
 */
export function normalizeUsage(usage) {
  if (!usage) return { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
  const input = usage.inputTokens ?? usage.promptTokens ?? 0;
  const output = usage.outputTokens ?? usage.completionTokens ?? 0;
  const total = usage.totalTokens ?? input + output;
  return {
    total_tokens: total || 0,
    prompt_tokens: input || 0,
    completion_tokens: output || 0,
  };
}
