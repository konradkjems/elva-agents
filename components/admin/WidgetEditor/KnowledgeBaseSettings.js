import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, FileText, Upload, Trash2, RefreshCw, Loader2, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * Knowledge base (vidensbase) for a widget — RAG sources.
 *
 * Self-contained like AISettings: owns its CRUD against
 * /api/admin/widgets/:id/knowledge/*, and writes the small `knowledgeBase`
 * binding ({ enabled, topK }) back into widget `settings` via onChange so the
 * widget's own Save persists it. While sources are crawling/indexing it polls the
 * reprocess endpoint to drive the pipeline forward (independent of the cron).
 */

const STATUS = {
  pending: { label: 'Afventer', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  crawling: { label: 'Crawler…', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  processing: { label: 'Indekserer…', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  ready: { label: 'Klar', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  failed: { label: 'Fejl', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const SOURCE_ICON = { website: Globe, text: FileText, file: Upload };

export default function KnowledgeBaseSettings({ settings, onChange }) {
  const widgetId = settings?._id || settings?.id;
  const kb = settings?.knowledgeBase || {};

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // { type:'ok'|'err', text }

  // Expand a source to inspect the excerpts (chunks) actually stored for RAG.
  const [expandedId, setExpandedId] = useState(null);
  const [chunksById, setChunksById] = useState({});
  const [chunksLoading, setChunksLoading] = useState(false);

  const [url, setUrl] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const fileRef = useRef(null);

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-primary';

  const base = widgetId ? `/api/admin/widgets/${widgetId}/knowledge` : null;

  const loadDocs = useCallback(async () => {
    if (!base) return;
    try {
      const res = await fetch(base);
      if (!res.ok) throw new Error('Kunne ikke hente kilder');
      setDocs(await res.json());
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    }
  }, [base]);

  useEffect(() => {
    setLoading(true);
    loadDocs().finally(() => setLoading(false));
  }, [loadDocs]);

  // Drive crawling/indexing forward while the editor is open.
  const active = docs.some((d) => d.status === 'crawling' || d.status === 'processing');
  useEffect(() => {
    if (!base || !active) return undefined;
    const t = setInterval(async () => {
      try {
        await fetch(`${base}/reprocess`, { method: 'POST' });
      } catch {
        /* best effort */
      }
      loadDocs();
    }, 10000);
    return () => clearInterval(t);
  }, [base, active, loadDocs]);

  const updateKB = (patch) => {
    onChange({ ...settings, knowledgeBase: { ...(settings.knowledgeBase || {}), ...patch } });
  };

  const post = async (body) => {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Handlingen mislykkedes');
    return res.json();
  };

  const handleAddWebsite = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      await post({ type: 'website', url: url.trim() });
      setUrl('');
      setStatus({ type: 'ok', text: 'Website tilføjet — crawl er sat i gang.' });
      await loadDocs();
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleAddText = async () => {
    if (!textContent.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      await post({ type: 'text', title: textTitle.trim(), content: textContent.trim() });
      setTextTitle('');
      setTextContent('');
      setStatus({ type: 'ok', text: 'Tekst tilføjet og indekseret.' });
      await loadDocs();
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${base}/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload mislykkedes');
      setStatus({ type: 'ok', text: 'Fil uploadet og indekseret.' });
      await loadDocs();
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (docId) => {
    setStatus(null);
    try {
      const res = await fetch(`${base}/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Kunne ikke slette');
      if (expandedId === docId) setExpandedId(null);
      setChunksById((m) => { const n = { ...m }; delete n[docId]; return n; });
      await loadDocs();
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    }
  };

  const handleReprocess = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await fetch(`${base}/reprocess`, { method: 'POST' });
      // Content may have changed — drop cached excerpts and collapse.
      setChunksById({});
      setExpandedId(null);
      await loadDocs();
      setStatus({ type: 'ok', text: 'Indeksering kørt.' });
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  // Fetch + show (or hide) the stored excerpts for a source.
  const toggleChunks = async (docId) => {
    if (expandedId === docId) { setExpandedId(null); return; }
    setExpandedId(docId);
    if (chunksById[docId]) return;
    setChunksLoading(true);
    try {
      const res = await fetch(`${base}/${docId}?chunks=1`);
      if (!res.ok) throw new Error((await res.json()).error || 'Kunne ikke hente indhold');
      const data = await res.json();
      setChunksById((m) => ({ ...m, [docId]: data.chunks || [] }));
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
      setExpandedId(null);
    } finally {
      setChunksLoading(false);
    }
  };

  if (!widgetId) {
    return <p className="text-sm text-gray-500">Gem widget’en først for at tilføje en vidensbase.</p>;
  }

  const enabled = kb.enabled === true;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Tilføj kilder, så chatbotten svarer ud fra dit faktiske indhold. Hentet tekst opdeles, embeddes og
        slås op ved hvert spørgsmål (RAG). Virker kun for in-platform widgets.
      </p>

      {/* Enable + topK */}
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-gray-200 dark:border-gray-700 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => updateKB({ enabled: e.target.checked })}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          Brug vidensbase
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Antal uddrag (top-k)</span>
          <input
            type="number"
            min="1"
            max="12"
            value={kb.topK ?? 5}
            onChange={(e) => updateKB({ topK: Number(e.target.value) })}
            className="w-20 px-2 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          />
        </div>
        <span className="text-xs text-gray-500">Husk at gemme widget’en.</span>
      </div>

      {/* Add website */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Tilføj website</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ditfirma.dk"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddWebsite(); }}
          />
          <button
            type="button"
            onClick={handleAddWebsite}
            disabled={busy || !url.trim()}
            className="shrink-0 px-3 py-2 text-sm font-medium rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
          >
            Crawl
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">Crawler op til ~50 sider. Kører i baggrunden.</p>
      </div>

      {/* Add text */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Tilføj tekst</label>
        <input
          className={`${inputClass} mb-2`}
          value={textTitle}
          onChange={(e) => setTextTitle(e.target.value)}
          placeholder="Titel (fx FAQ, leveringsbetingelser)"
        />
        <textarea
          className={`${inputClass} min-h-[100px]`}
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Indsæt tekst, FAQ, politikker …"
        />
        <button
          type="button"
          onClick={handleAddText}
          disabled={busy || !textContent.trim()}
          className="mt-2 px-3 py-2 text-sm font-medium rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
        >
          Tilføj tekst
        </button>
      </div>

      {/* Upload file */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Upload fil</label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => handleUpload(e.target.files?.[0])}
          disabled={busy}
          className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
        />
        <p className="mt-1 text-xs text-gray-500">PDF, DOCX, TXT eller MD (maks. 10 MB).</p>
      </div>

      {/* Source list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Kilder</h4>
          <button
            type="button"
            onClick={handleReprocess}
            disabled={busy}
            className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className="w-3 h-3" /> Indeksér nu
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Indlæser…
          </p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-gray-500">Ingen kilder endnu.</p>
        ) : (
          <ul className="space-y-1">
            {docs.map((d) => {
              const Icon = SOURCE_ICON[d.sourceType] || FileText;
              const s = STATUS[d.status] || STATUS.pending;
              const did = d._id || d.id;
              const isOpen = expandedId === did;
              const chunks = chunksById[did] || [];
              return (
                <li
                  key={did}
                  className="text-sm py-2 border-b border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 text-gray-400" />
                      <span className="truncate text-gray-700 dark:text-gray-300" title={d.sourceUrl || d.title}>
                        {d.title || d.sourceUrl || 'Kilde'}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      {d.status === 'ready' && d.chunkCount > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleChunks(did)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary"
                          title="Vis det gemte indhold"
                        >
                          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {d.chunkCount} uddrag
                        </button>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`} title={d.error || ''}>
                        {s.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(did)}
                        className="text-gray-400 hover:text-red-600"
                        title="Slet kilde"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </span>
                  </div>

                  {isOpen && (
                    <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3 max-h-80 overflow-auto space-y-3">
                      {chunksLoading && chunks.length === 0 ? (
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" /> Henter indhold…
                        </p>
                      ) : chunks.length === 0 ? (
                        <p className="text-xs text-gray-500">Intet gemt indhold.</p>
                      ) : (
                        chunks.map((c) => (
                          <div key={c._id || c.id} className="text-xs">
                            <div className="text-gray-400 mb-0.5">
                              Uddrag {(c.chunkIndex ?? 0) + 1}
                              {c.tokenCount ? ` · ~${c.tokenCount} tokens` : ''}
                            </div>
                            <p className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300 leading-relaxed">
                              {c.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {status && (
        <p className={`text-sm ${status.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{status.text}</p>
      )}
    </div>
  );
}
