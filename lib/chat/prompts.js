/**
 * Resolve a widget's pinned in-platform prompt version into engine inputs.
 *
 * Pin semantics (widget.promptVersion):
 *   - 'latest' / null  → follow prompts.current_version_id (rollback affects the widget)
 *   - '<n>'            → frozen to that specific version number
 *
 * Returns the shape consumed by lib/ai/engine.js:
 *   { promptId, version, systemPrompt, provider, model, temperature, maxTokens, config }
 */

import { admin } from '../supabase/admin';

export async function resolvePromptVersion(widget) {
  const promptId = widget?.promptId;
  if (!promptId) {
    throw new Error('Widget has no in-platform prompt bound (promptId missing)');
  }

  const pin = widget.promptVersion || 'latest';

  // Load the owning prompt (for the current-version pointer).
  const { data: prompt, error: pErr } = await admin
    .from('prompts')
    .select('id, organization_id, current_version_id')
    .eq('id', promptId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!prompt) throw new Error(`Prompt ${promptId} not found`);

  let versionRow;
  if (pin === 'latest') {
    if (!prompt.current_version_id) {
      throw new Error(`Prompt ${promptId} has no current version`);
    }
    const { data, error } = await admin
      .from('prompt_versions')
      .select('*')
      .eq('id', prompt.current_version_id)
      .maybeSingle();
    if (error) throw error;
    versionRow = data;
  } else {
    const versionNum = Number(pin);
    if (!Number.isFinite(versionNum)) {
      throw new Error(`Invalid prompt version pin "${pin}" for prompt ${promptId}`);
    }
    const { data, error } = await admin
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .eq('version', versionNum)
      .maybeSingle();
    if (error) throw error;
    versionRow = data;
  }

  if (!versionRow) {
    throw new Error(`Prompt version not found for ${promptId} (pin=${pin})`);
  }

  return {
    promptId,
    version: versionRow.version,
    systemPrompt: versionRow.system_prompt,
    provider: versionRow.provider,
    model: versionRow.model,
    temperature: versionRow.temperature,
    maxTokens: versionRow.max_tokens,
    config: versionRow.config || {},
  };
}
