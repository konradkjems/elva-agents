import ModernLayout from '../components/admin/ModernLayout';
import { Card } from '../components/ui/card';

export default function TermsOfService() {
  return (
    <ModernLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">Vilkår for Brug</h1>
        <p className="text-muted-foreground mb-8">
          Sidst opdateret: {new Date().toLocaleDateString('da-DK')}
        </p>

        <Card className="p-8">
          <div className="prose prose-lg max-w-none">
            <h2>1. Acceptering af vilkår</h2>
            <p>
              Ved at bruge Elva Solutions' AI chat widget platform accepterer du disse vilkår.
            </p>

            <h2>2. Beskrivelse af service</h2>
            <p>
              Elva Solutions leverer en AI-drevet chat widget platform, der gør det muligt 
              for virksomheder at tilbyde automatiseret kundeservice på deres websites.
            </p>

            <h2>3. Brugeransvar</h2>
            <p>Du er ansvarlig for:</p>
            <ul>
              <li>At holde dine login oplysninger sikre</li>
              <li>Alt indhold du konfigurerer i dine widgets</li>
              <li>Overholdelse af GDPR på din egen website</li>
              <li>Korrekt brug af platformen</li>
            </ul>

            <h2>4. Databehandling</h2>
            <p>
              Vi behandler persondata som beskrevet i vores <a href="/privacy" className="text-blue-600 hover:underline">Privatlivspolitik</a>.
            </p>

            <h2>5. Opsigelse</h2>
            <p>
              Du kan til enhver tid slette din konto via din profilside. Data vil blive 
              permanent slettet efter 30 dages grace periode.
            </p>

            <h2>6. Ansvarsbegrænsning</h2>
            <p>
              Servicen leveres "as is". Vi er ikke ansvarlige for indirekte skader eller 
              tab som følge af brug af platformen.
            </p>

            <h2>7. Ændringer</h2>
            <p>
              Vi forbeholder os retten til at opdatere disse vilkår. Væsentlige ændringer 
              vil blive kommunikeret via email.
            </p>

            <h2>8. Kontakt</h2>
            <p>
              Ved spørgsmål til disse vilkår, kontakt os på:
            </p>
            <p>
              <strong>Elva Solutions ApS</strong><br />
              Email: <a href="mailto:support@elva-solutions.com" className="text-blue-600 hover:underline">support@elva-solutions.com</a>
            </p>

            <div className="bg-gray-100 border border-gray-200 rounded p-4 mt-8">
              <p className="text-sm text-gray-600 mb-0">
                <strong>Note:</strong> Disse vilkår er under juridisk review. 
                Kontakt en advokat før publicering i production.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </ModernLayout>
  );
}

