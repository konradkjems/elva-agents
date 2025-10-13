import ModernLayout from '../components/admin/ModernLayout';
import { Card } from '../components/ui/card';

export default function PrivacyPolicy() {
  return (
    <ModernLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">Privatlivspolitik</h1>
        <p className="text-muted-foreground mb-8">
          Sidst opdateret: {new Date().toLocaleDateString('da-DK')}
        </p>

        <Card className="p-8">
          <div className="prose prose-lg max-w-none">
            <h2>1. Hvem er vi?</h2>
            <p>
              Elva Solutions (CVR: 44543133) er dataansvarlig for behandlingen af 
              dine personoplysninger i forbindelse med brugen af vores AI chat widget platform.
            </p>

            <h2>2. Hvilke personoplysninger indsamler vi?</h2>
            <p><strong>For platformbrugere (administratorer):</strong></p>
            <ul>
              <li>Email adresse</li>
              <li>Navn</li>
              <li>Password (krypteret med bcrypt)</li>
              <li>Profilbillede (valgfrit)</li>
              <li>Login tidspunkter</li>
              <li>Præferencer og indstillinger</li>
            </ul>

            <p><strong>For slutbrugere (widget-besøgende):</strong></p>
            <ul>
              <li>Anonym bruger-ID (genereret automatisk)</li>
              <li>Beskedindhold i chat samtaler</li>
              <li>Land (ikke præcis IP-adresse)</li>
              <li>Browser information (user agent)</li>
              <li>Tilfredshedsvurderinger (hvis givet)</li>
            </ul>

            <h2>3. Hvorfor behandler vi dine oplysninger?</h2>
            <p>Vi behandler personoplysninger til følgende formål:</p>
            <ul>
              <li><strong>Kontraktuel forpligtelse:</strong> Levere AI chat widget service</li>
              <li><strong>Legitim interesse:</strong> Forbedre service kvalitet og sikkerhed</li>
              <li><strong>Samtykke:</strong> Analytics og funktionel funktionalitet (via cookie banner)</li>
            </ul>

            <h2>4. Videregivelse af oplysninger</h2>
            <p>Vi videregiver oplysninger til følgende databehandlere:</p>
            <ul>
              <li><strong>OpenAI:</strong> AI processing af beskeder</li>
              <li><strong>MongoDB Atlas:</strong> Database hosting</li>
              <li><strong>Vercel:</strong> Hosting og infrastructure</li>
              <li><strong>Resend:</strong> Email notifikationer</li>
              <li><strong>Cloudinary:</strong> Billed hosting</li>
            </ul>
            <p>Alle databehandlere har underskrevet Data Processing Agreements (DPA).</p>

            <h2>5. Hvor længe opbevares oplysninger?</h2>
            <ul>
              <li><strong>Samtaler:</strong> 30 dage (konfigurerbart per widget)</li>
              <li><strong>Kontodata:</strong> Indtil sletning af konto</li>
              <li><strong>Analytics:</strong> Anonymiseret uden tidsbegrænsning</li>
            </ul>

            <h2>6. Dine rettigheder</h2>
            <p>Du har følgende rettigheder under GDPR:</p>
            <ul>
              <li><strong>Ret til indsigt:</strong> Se hvilke data vi har om dig</li>
              <li><strong>Ret til berigtigelse:</strong> Få rettet forkerte oplysninger</li>
              <li><strong>Ret til sletning:</strong> Få slettet dine oplysninger ("retten til at blive glemt")</li>
              <li><strong>Ret til dataportabilitet:</strong> Få dine data i maskinlæsbart format</li>
              <li><strong>Ret til indsigelse:</strong> Gøre indsigelse mod behandling</li>
              <li><strong>Ret til at trække samtykke tilbage:</strong> Ændre dine cookie præferencer</li>
            </ul>

            <p>
              For at udøve dine rettigheder, besøg din <a href="/admin/profile#gdpr" className="text-blue-600 hover:underline">profilside</a> 
              eller kontakt os på <a href="mailto:konradkjems@gmail.com" className="text-blue-600 hover:underline">privacy@elva-solutions.com</a>
            </p>

            <h2>7. Klage til Datatilsynet</h2>
            <p>
              Du har ret til at indgive klage til Datatilsynet, hvis du mener, at vi behandler 
              dine personoplysninger i strid med databeskyttelsesreglerne.
            </p>
            <p>
              <strong>Datatilsynet</strong><br />
              Borgergade 28, 5.<br />
              1300 København K<br />
              Email: <a href="mailto:dt@datatilsynet.dk" className="text-blue-600 hover:underline">dt@datatilsynet.dk</a><br />
              Telefon: +45 33 19 32 00
            </p>

            <h2>8. Kontakt</h2>
            <p>
              Ved spørgsmål om vores behandling af personoplysninger kan du kontakte os:
            </p>
            <p>
              <strong>Elva Solutions</strong><br />
              Email: <a href="mailto:konradkjems@gmail.com" className="text-blue-600 hover:underline">privacy@elva-solutions.com</a>
            </p>

            <div className="bg-gray-100 border border-gray-200 rounded p-4 mt-8">
              <p className="text-sm text-gray-600 mb-0">
                <strong>Note:</strong> Denne privatlivspolitik er under juridisk review. 
                Kontakt en GDPR advokat før publicering i production.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </ModernLayout>
  );
}

