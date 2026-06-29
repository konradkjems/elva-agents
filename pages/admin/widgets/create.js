import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from '@/lib/supabase/auth-context';
import ModernLayout from '../../../components/admin/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Sparkles, Globe, PenLine, Wand2 } from 'lucide-react';
import { MODELS, DEFAULT_MODEL, getModelById } from '@/lib/ai/models';

// Static route — takes precedence over [id]/index.js for /admin/widgets/create.
// Creates an in-platform widget from the start: a versioned prompt (v1) + a widget
// bound to it, then opens the full editor. Two modes: from scratch, or auto-create
// from a website (Firecrawl crawl + LLM synthesis → pre-fills this form).
export default function CreateWidget() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [mode, setMode] = useState('scratch'); // 'scratch' | 'website'
  const [url, setUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedInfo, setGeneratedInfo] = useState(null); // { sourceUrl, pagesCrawled }
  const [seedKnowledge, setSeedKnowledge] = useState(true); // seed RAG knowledge base from the same site

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modelId, setModelId] = useState(DEFAULT_MODEL.id);
  const [systemPrompt, setSystemPrompt] = useState('Du er en hjælpsom kundeservice-assistent. Svar kort, venligt og præcist.');
  const [welcomeMessage, setWelcomeMessage] = useState('Hej! Hvordan kan jeg hjælpe dig i dag?');
  const [suggestedQuestions, setSuggestedQuestions] = useState('');
  // Generated-only metadata carried into the widget payload (no dedicated fields).
  const [companyName, setCompanyName] = useState('');
  const [assistantName, setAssistantName] = useState('');
  const [language, setLanguage] = useState('');
  const [creating, setCreating] = useState(false);

  const handleGenerate = async () => {
    if (!url.trim()) {
      toast({ title: 'URL mangler', description: 'Indtast din websites adresse.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/widgets/generate-from-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Kunne ikke generere fra website');
      const { config, sourceUrl, pagesCrawled } = await res.json();

      setName(config.name || '');
      setSystemPrompt(config.systemPrompt || '');
      setWelcomeMessage(config.welcomeMessage || 'Hej! Hvordan kan jeg hjælpe dig i dag?');
      setSuggestedQuestions((config.suggestedQuestions || []).join('\n'));
      setCompanyName(config.companyName || '');
      setAssistantName(config.assistantName || '');
      setLanguage(config.language || '');
      setGeneratedInfo({ sourceUrl, pagesCrawled });

      toast({
        title: 'Udkast genereret',
        description: `Læste ${pagesCrawled} side(r) fra ${sourceUrl}. Gennemse og ret inden du opretter.`,
      });
    } catch (err) {
      toast({ title: 'Fejl', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Navn mangler', description: 'Giv din chatbot et navn.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const chosen = getModelById(modelId) || DEFAULT_MODEL;

      // 1) Create the prompt + its first version.
      const promptRes = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${name.trim()} prompt`,
          systemPrompt,
          provider: chosen.provider,
          model: chosen.model,
        }),
      });
      if (!promptRes.ok) throw new Error((await promptRes.json()).error || 'Kunne ikke oprette prompt');
      const prompt = await promptRes.json();
      const promptId = prompt._id || prompt.id;

      // Build the (optionally generated) message/branding payload.
      const suggested = suggestedQuestions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const messages = {
        welcomeMessage: welcomeMessage.trim() || 'Hej! Hvordan kan jeg hjælpe dig i dag?',
        ...(suggested.length ? { suggestedResponses: suggested } : {}),
      };
      const branding =
        companyName || assistantName
          ? {
              ...(companyName ? { companyName } : {}),
              ...(assistantName ? { assistantName } : {}),
            }
          : undefined;

      // 2) Create the widget bound to the prompt (in-platform engine).
      const widgetRes = await fetch('/api/admin/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          ai: { engine: 'in-platform' },
          promptId,
          promptVersion: 'latest',
          messages,
          branding,
          ...(language ? { advanced: { language } } : {}),
        }),
      });
      if (!widgetRes.ok) throw new Error((await widgetRes.json()).error || 'Kunne ikke oprette widget');
      const widget = await widgetRes.json();
      const widgetId = widget._id || widget.id;

      // 3) If created from a website, seed the knowledge base from the same site.
      // Best-effort: reuses the website-source endpoint (Firecrawl crawl → chunk →
      // embed). The editor's "Vidensbase" section then polls the crawl to completion
      // and auto-enables retrieval once content is ready. A failure here must not
      // block widget creation — the user can always add the site manually later.
      let kbSeeded = false;
      const seedUrl = (generatedInfo?.sourceUrl || url || '').trim();
      if (mode === 'website' && seedKnowledge && seedUrl) {
        try {
          const kbRes = await fetch(`/api/admin/widgets/${widgetId}/knowledge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'website', url: seedUrl }),
          });
          kbSeeded = kbRes.ok;
          if (!kbRes.ok) {
            const e = await kbRes.json().catch(() => ({}));
            console.warn('Knowledge-base seed failed:', e.error);
          }
        } catch (e) {
          console.warn('Knowledge-base seed failed:', e?.message);
        }
      }

      toast({
        title: 'Chatbot oprettet',
        description: kbSeeded
          ? 'Vidensbasen bygges fra dit website — følg fremdriften under "Vidensbase".'
          : 'Tilpas udseende og prompt i editoren.',
      });
      router.push(`/admin/widgets/${widgetId}`);
    } catch (err) {
      toast({ title: 'Fejl', description: err.message, variant: 'destructive' });
      setCreating(false);
    }
  };

  const modeBtn = (value, label, Icon) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
        mode === value
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <ModernLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/widgets')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Tilbage
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Ny chatbot</CardTitle>
                <CardDescription>Opret en chatbot med platformens prompt-motor og valgfri model.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex gap-2">
              {modeBtn('scratch', 'Fra bunden', PenLine)}
              {modeBtn('website', 'Fra website', Globe)}
            </div>

            {mode === 'website' && (
              <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/40">
                <div>
                  <Label htmlFor="url">Website-URL</Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://ditfirma.dk"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
                  />
                </div>
                <Button onClick={handleGenerate} disabled={generating} variant="secondary" className="w-full">
                  <Wand2 className="w-4 h-4 mr-2" />
                  {generating ? 'Læser website og genererer…' : 'Generér udkast fra website'}
                </Button>
                {generatedInfo && (
                  <p className="text-xs text-green-600">
                    Genereret fra {generatedInfo.sourceUrl} ({generatedInfo.pagesCrawled} side(r)). Gennemse og ret nedenfor.
                  </p>
                )}
                <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={seedKnowledge}
                    onChange={(e) => setSeedKnowledge(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>
                    Brug sidens indhold som botten vidensbase
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      Vi crawler dit website og lader botten svare ud fra indholdet (RAG). Kan justeres senere under "Vidensbase".
                    </span>
                  </span>
                </label>
              </div>
            )}

            <div>
              <Label htmlFor="name">Navn</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="F.eks. Kundeservice-bot" />
            </div>

            <div>
              <Label htmlFor="description">Beskrivelse (valgfri)</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kort beskrivelse" />
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <select
                id="model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-primary"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="systemPrompt">System-prompt</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[160px] font-mono"
              />
            </div>

            <div>
              <Label htmlFor="welcomeMessage">Velkomstbesked</Label>
              <Input id="welcomeMessage" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="suggestedQuestions">Foreslåede spørgsmål (ét pr. linje)</Label>
              <Textarea
                id="suggestedQuestions"
                value={suggestedQuestions}
                onChange={(e) => setSuggestedQuestions(e.target.value)}
                className="min-h-[90px]"
                placeholder={'Hvad koster det?\nHvordan kommer jeg i gang?'}
              />
            </div>

            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? 'Opretter…' : 'Opret chatbot'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}
