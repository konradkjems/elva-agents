import { useState } from 'react';
import { Download, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';

export default function DataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/user/export-data');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to export data');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `elva-data-export-${Date.now()}.json`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);

    } catch (error) {
      console.error('Export error:', error);
      setError(error.message || 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white dark:bg-slate-950">
      <div className="flex items-start gap-3 mb-3">
        <Download className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">Download dine data</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Download alle dine personlige data i JSON format. Dette inkluderer din profil,
            organisationer, widgets, samtaler og analytics.
          </p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4 text-sm">
          <strong>Fejl:</strong> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded mb-4 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>Dine data er blevet downloadet successfully!</span>
        </div>
      )}

      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 w-full sm:w-auto"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Eksporterer data...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download Mine Data
          </>
        )}
      </Button>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>GDPR Rettigheder:</strong> Dette er din ret under GDPR Artikel 15 (Ret til indsigt) 
          og Artikel 20 (Dataportabilitet). Data eksporteres i maskinlæsbart JSON format.
        </p>
      </div>
    </div>
  );
}

