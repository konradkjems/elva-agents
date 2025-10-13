import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="font-semibold mb-4">Elva Solutions</h3>
            <p className="text-sm text-gray-600">
              AI-drevet chat widgets til din virksomhed
            </p>
            <p className="text-sm text-gray-500 mt-2">
              CVR: [INDSÆT CVR]
            </p>
          </div>
          
          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-4">Juridisk</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Privatlivspolitik
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Vilkår for Brug
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Cookie Politik
                </Link>
              </li>
            </ul>
          </div>
          
          {/* GDPR Rights */}
          <div>
            <h4 className="font-semibold mb-4">Dine GDPR Rettigheder</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/admin/profile#gdpr" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Download Dine Data
                </Link>
              </li>
              <li>
                <Link href="/admin/profile#gdpr" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Slet Din Konto
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:privacy@elva-solutions.com" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Privatlivsspørgsmål
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Kontakt</h4>
            <p className="text-sm text-gray-600">
              <strong>Elva Solutions ApS</strong>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <a 
                href="mailto:support@elva-solutions.com" 
                className="text-blue-600 hover:underline"
              >
                support@elva-solutions.com
              </a>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <a 
                href="mailto:privacy@elva-solutions.com" 
                className="text-blue-600 hover:underline"
              >
                privacy@elva-solutions.com
              </a>
            </p>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
          <p>© {currentYear} Elva Solutions ApS. All rights reserved.</p>
          
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms
            </Link>
            <Link href="/cookies" className="hover:text-gray-900 transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

