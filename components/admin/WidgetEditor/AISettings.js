import { useState, useEffect, useCallback } from 'react';
import { MODELS, DEFAULT_MODEL, getModelById, gatewayString } from '@/lib/ai/models';

/**
 * AI / prompt configuration for a widget.
 *
 * The prompt is a SEPARATE versioned resource (prompts + prompt_versions),
 * managed via /api/admin/prompts/*. This component owns its own fetch/save
 * against that API, and writes the binding (promptId / promptVersion / ai.engine)
 * back into the widget `settings` via onChange so the widget's own Save persists it.
 */
export default function AISettings({ settings, onChange }) {
  const widgetId = settings?._id || settings?.id;
  const promptId = settings?.promptId || null;
  const pin = settings?.promptVersion || 'latest';

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'ok'|'err', text }
  const [versions, setVersions] = useState([]);
  const [currentVersionNo, setCurrentVersionNo] = useState(null);

  // Editor fields
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelId, setModelId] = useState(DEFAULT_MODEL.id);
  const [temperature, setTemperature] = useState('');
  const [maxTokens, setMaxTokens] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [activating, setActivating] = useState(false);

  const applyVersionToEditor = useCallback((v) => {
    if (!v) return;
    setSystemPrompt(v.systemPrompt || '');
    setModelId(gatewayString(v.provider, v.model));
    setTemperature(v.temperature ?? '');
    setMaxTokens(v.maxTokens ?? '');
  }, []);

  const loadPrompt = useCallback(async () => {
    if (!promptId) return;
    setLoading(true);
    setStatus(null);
    try {
      const [detailRes, versionsRes] = await Promise.all([
        fetch(`/api/admin/prompts/${promptId}`),
        fetch(`/api/admin/prompts/${promptId}/versions`),
      ]);
      if (!detailRes.ok) throw new Error('Kunne ikke hente prompt');
      const detail = await detailRes.json();
      const versionList = versionsRes.ok ? await versionsRes.json() : [];
      setVersions(versionList);
      setCurrentVersionNo(detail.currentVersion?.version ?? null);

      // Show the pinned version if frozen, else the current version.
      let shown = detail.currentVersion;
      if (pin !== 'latest') {
        const found = versionList.find((v) => String(v.version) === String(pin));
        if (found) shown = found;
      }
      applyVersionToEditor(shown);
    } catch (err) {
      setStatus({ type: 'err', text: err.message || 'Fejl ved indlæsning' });
    } finally {
      setLoading(false);
    }
  }, [promptId, pin, applyVersionToEditor]);

  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  const updateBinding = (patch) => {
    onChange({
      ...settings,
      ...patch,
      ai: { ...(settings.ai || {}), engine: 'in-platform', ...(patch.ai || {}) },
    });
  };

  // Turn a legacy/openai-hosted widget into an in-platform one by creating a prompt.
  const handleActivate = async () => {
    setActivating(true);
    setStatus(null);
    try {
      const chosen = getModelById(modelId) || DEFAULT_MODEL;
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${settings.name || 'Widget'} prompt`,
          widgetId,
          systemPrompt: systemPrompt || settings.prompt || '',
          provider: chosen.provider,
          model: chosen.model,
          temperature: temperature === '' ? null : Number(temperature),
          maxTokens: maxTokens === '' ? null : Number(maxTokens),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Kunne ikke oprette prompt');
      const created = await res.json();
      updateBinding({ promptId: created._id || created.id, promptVersion: 'latest' });
      setStatus({ type: 'ok', text: 'In-platform prompt oprettet. Husk at gemme widget’en.' });
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    } finally {
      setActivating(false);
    }
  };

  const handleSaveNewVersion = async () => {
    if (!promptId) return;
    setSavingVersion(true);
    setStatus(null);
    try {
      const chosen = getModelById(modelId) || DEFAULT_MODEL;
      const res = await fetch(`/api/admin/prompts/${promptId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          provider: chosen.provider,
          model: chosen.model,
          temperature: temperature === '' ? null : Number(temperature),
          maxTokens: maxTokens === '' ? null : Number(maxTokens),
          setCurrent: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Kunne ikke gemme version');
      // New version becomes current → follow latest.
      updateBinding({ promptVersion: 'latest' });
      await loadPrompt();
      setStatus({ type: 'ok', text: 'Ny version gemt og sat som aktuel.' });
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    } finally {
      setSavingVersion(false);
    }
  };

  const handleRestore = async (versionNo) => {
    if (!promptId) return;
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/prompts/${promptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollbackToVersion: versionNo }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Kunne ikke gendanne version');
      updateBinding({ promptVersion: 'latest' });
      await loadPrompt();
      setStatus({ type: 'ok', text: `Version ${versionNo} sat som aktuel.` });
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    }
  };

  const handlePinChange = (value) => {
    updateBinding({ promptVersion: value });
    if (value === 'latest') {
      const cur = versions.find((v) => v.version === currentVersionNo);
      applyVersionToEditor(cur);
    } else {
      const found = versions.find((v) => String(v.version) === String(value));
      applyVersionToEditor(found);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-primary';

  // Not yet an in-platform widget.
  if (!promptId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Denne widget bruger ikke platformens prompt-motor endnu. Aktivér den for at styre
          system-prompt og model (OpenAI, Anthropic, Google) direkte her — uafhængigt af OpenAI-hostede prompts.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Model</label>
          <select className={inputClass} value={modelId} onChange={(e) => setModelId(e.target.value)}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">System-prompt</label>
          <textarea
            className={`${inputClass} min-h-[140px] font-mono`}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Du er en hjælpsom kundeservice-assistent for …"
          />
        </div>
        <button
          type="button"
          onClick={handleActivate}
          disabled={activating}
          className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
        >
          {activating ? 'Aktiverer…' : 'Aktivér in-platform prompt'}
        </button>
        {status && (
          <p className={`text-sm ${status.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{status.text}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loading && <p className="text-sm text-gray-500">Indlæser prompt…</p>}

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Model</label>
        <select className={inputClass} value={modelId} onChange={(e) => setModelId(e.target.value)}>
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">Routes via Vercel AI Gateway. Ændringer træder i kraft når du gemmer en ny version.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">System-prompt</label>
        <textarea
          className={`${inputClass} min-h-[180px] font-mono`}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Temperatur</label>
          <input
            type="number" step="0.1" min="0" max="2"
            className={inputClass}
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="standard"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Max tokens</label>
          <input
            type="number" min="1"
            className={inputClass}
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            placeholder="standard"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSaveNewVersion}
          disabled={savingVersion}
          className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
        >
          {savingVersion ? 'Gemmer…' : 'Gem som ny version'}
        </button>
        <span className="text-xs text-gray-500">
          Aktuel version: {currentVersionNo ?? '—'}
        </span>
      </div>

      {/* Version pinning */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Anvendt version</label>
        <select className={inputClass} value={pin} onChange={(e) => handlePinChange(e.target.value)}>
          <option value="latest">Seneste (følger nyeste / rollback)</option>
          {versions.map((v) => (
            <option key={v.id || v._id} value={String(v.version)}>
              Version {v.version}{v.version === currentVersionNo ? ' (aktuel)' : ''}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          “Seneste” følger den aktuelle version (og rollback). Vælg et nummer for at fastlåse widget’en til en bestemt version.
        </p>
      </div>

      {/* Version history */}
      {versions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Versionshistorik</h4>
          <ul className="space-y-1">
            {versions.map((v) => (
              <li key={v.id || v._id} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-700 dark:text-gray-300">
                  Version {v.version} · {v.provider}/{v.model}
                  {v.version === currentVersionNo && <span className="ml-2 text-xs text-green-600">aktuel</span>}
                </span>
                {v.version !== currentVersionNo && (
                  <button
                    type="button"
                    onClick={() => handleRestore(v.version)}
                    className="text-xs text-primary hover:underline"
                  >
                    Gendan som aktuel
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {status && (
        <p className={`text-sm ${status.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{status.text}</p>
      )}
    </div>
  );
}
