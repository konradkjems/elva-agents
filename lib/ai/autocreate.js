/**
 * LLM synthesis of a starter chatbot config from crawled website content.
 *
 * Uses the Vercel AI SDK `generateObject` with a zod schema (reliable structured
 * output) routed through the AI Gateway. Returns a config the create flow pre-fills;
 * nothing is written to the DB here.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { gatewayString, isValidModel } from './models';

// Strong default model for synthesis quality. Overridable via args.
const SYNTHESIS_PROVIDER = 'anthropic';
const SYNTHESIS_MODEL = 'claude-sonnet-4.6';

const configSchema = z.object({
  name: z.string().describe('Kort navn til chatbotten, fx "<Firma> kundeservice"'),
  companyName: z.string().describe('Virksomhedens navn'),
  assistantName: z.string().describe('Et kort, venligt navn til selve assistenten'),
  language: z.string().describe('Primært sprog som ISO-kode, fx "da" eller "en"'),
  systemPrompt: z
    .string()
    .describe(
      'System-instruktioner til chatbotten: dens rolle, tone, hvad den ved om virksomheden, og hvad den kan hjælpe besøgende med. Skrives på sidens sprog. Brug kun fakta fra indholdet.'
    ),
  welcomeMessage: z.string().describe('Kort velkomstbesked på sidens sprog'),
  suggestedQuestions: z
    .array(z.string())
    .describe('3-4 foreslåede spørgsmål en besøgende realistisk kunne stille'),
});

export async function generateChatbotConfig({ siteContent, sourceUrl, provider, model }) {
  const useCustom = provider && model && isValidModel(provider, model);
  const p = useCustom ? provider : SYNTHESIS_PROVIDER;
  const m = useCustom ? model : SYNTHESIS_MODEL;

  const { object } = await generateObject({
    model: gatewayString(p, m),
    schema: configSchema,
    schemaName: 'ChatbotConfig',
    system:
      'Du er ekspert i at opsætte AI-kundeservice-chatbots. Ud fra en virksomheds website-indhold ' +
      'udleder du en præcis konfiguration. Brug KUN information fra indholdet — opfind ikke fakta, ' +
      'priser, produkter eller løfter. Skriv alt indhold på samme sprog som sitet.',
    prompt:
      `Website: ${sourceUrl}\n\n` +
      `Indhold (markdown fra flere sider):\n\n${siteContent}\n\n` +
      `Udled en chatbot-konfiguration til denne virksomhed.`,
  });

  return object;
}
