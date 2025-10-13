import ModernLayout from '../components/admin/ModernLayout';
import { Card } from '../components/ui/card';

export default function CookiePolicy() {
  return (
    <ModernLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">Cookie Politik</h1>
        <p className="text-muted-foreground mb-8">
          Sidst opdateret: {new Date().toLocaleDateString('da-DK')}
        </p>

        <Card className="p-8">
          <div className="prose prose-lg max-w-none">
            <h2>1. Hvad er cookies?</h2>
            <p>
              Cookies og localStorage er små datafiler der gemmes i din browser for at 
              forbedre din oplevelse af vores service.
            </p>

            <h2>2. Hvilke cookies bruger vi?</h2>
            
            <h3>Nødvendige (altid aktive)</h3>
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2">Cookie</th>
                  <th className="border border-gray-300 px-4 py-2">Formål</th>
                  <th className="border border-gray-300 px-4 py-2">Udløb</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">next-auth.session-token</td>
                  <td className="border border-gray-300 px-4 py-2">Autentifikation</td>
                  <td className="border border-gray-300 px-4 py-2">24 timer</td>
                </tr>
              </tbody>
            </table>

            <h3>Funktionelle (kræver samtykke)</h3>
            <table className="min-w-full border border-gray-300 mt-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2">LocalStorage Key</th>
                  <th className="border border-gray-300 px-4 py-2">Formål</th>
                  <th className="border border-gray-300 px-4 py-2">Udløb</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">chatUserId_[widgetId]</td>
                  <td className="border border-gray-300 px-4 py-2">Bruge fortsætte samtaler</td>
                  <td className="border border-gray-300 px-4 py-2">Permanent</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">conversationId_[widgetId]</td>
                  <td className="border border-gray-300 px-4 py-2">Gem aktuel samtale</td>
                  <td className="border border-gray-300 px-4 py-2">Permanent</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">conversationHistory_[widgetId]</td>
                  <td className="border border-gray-300 px-4 py-2">Gem samtale historik</td>
                  <td className="border border-gray-300 px-4 py-2">Permanent</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">elva-consent-[widgetId]</td>
                  <td className="border border-gray-300 px-4 py-2">Gem dine samtykke præferencer</td>
                  <td className="border border-gray-300 px-4 py-2">30 dage</td>
                </tr>
              </tbody>
            </table>

            <h3>Analytics (kræver samtykke)</h3>
            <table className="min-w-full border border-gray-300 mt-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2">Data</th>
                  <th className="border border-gray-300 px-4 py-2">Formål</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Land (fra IP)</td>
                  <td className="border border-gray-300 px-4 py-2">Geografisk statistik</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Referrer URL</td>
                  <td className="border border-gray-300 px-4 py-2">Trafikanalyse</td>
                </tr>
              </tbody>
            </table>

            <h2>3. Sådan administrerer du cookies</h2>
            <p>
              Du kan til enhver tid ændre dine cookie præferencer ved at:
            </p>
            <ul>
              <li>Rydde din browsers localStorage</li>
              <li>Bruge cookie banneret når du genindlæser widget</li>
              <li>Kontakte os for at få hjælp</li>
            </ul>

            <h2>4. Tredjepartscookies</h2>
            <p>
              Vi bruger ikke tredjepartscookies til tracking eller reklamer.
            </p>

            <h2>5. Opdateringer</h2>
            <p>
              Denne cookie politik kan opdateres fra tid til anden. Væsentlige ændringer 
              vil blive kommunikeret via cookie banneret.
            </p>

            <h2>6. Kontakt</h2>
            <p>
              Ved spørgsmål til vores brug af cookies, kontakt:
            </p>
            <p>
              <strong>Elva Solutions ApS</strong><br />
              Email: <a href="mailto:privacy@elva-solutions.com" className="text-blue-600 hover:underline">privacy@elva-solutions.com</a>
            </p>

            <div className="bg-gray-100 border border-gray-200 rounded p-4 mt-8">
              <p className="text-sm text-gray-600 mb-0">
                <strong>Note:</strong> Denne cookie politik er under juridisk review. 
                Kontakt en GDPR advokat før publicering i production.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </ModernLayout>
  );
}

