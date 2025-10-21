import { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

export default function AccountDeletion() {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      setError('Indtast venligst dit password for at bekræfte');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmPassword: password,
          reason: reason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Show success message
      alert(`Din konto er markeret til sletning.\n\nDen vil blive permanent slettet ${new Date(data.deletionDate).toLocaleDateString('da-DK')}.\n\nDu har 30 dage til at fortryde ved at logge ind igen.`);
      
      // Sign out
      window.location.href = '/api/auth/signout';

    } catch (error) {
      console.error('Delete error:', error);
      setError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border border-red-200 dark:border-red-800 rounded-lg p-6 bg-red-50 dark:bg-red-950/30">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">Fareområde</h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            Sletning af din konto er permanent og kan ikke fortrydes efter grace perioden på 30 dage.
          </p>
        </div>
      </div>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Slet Min Konto
          </Button>
        </AlertDialogTrigger>
        
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Er du absolut sikker?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-left">
              <p className="font-medium text-foreground">
                Dette vil permanent slette din konto og alle tilhørende data efter 30 dages grace periode:
              </p>
              
              <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                <li>Din profil og login adgang</li>
                <li>Alle dine widgets og konfigurationer</li>
                <li>Alle samtaler og chat historik</li>
                <li>Alle analytics data</li>
                <li>Organisation medlemskaber</li>
                <li>Manuel review anmodninger</li>
              </ul>
              
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-sm">
                <p className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">⏰ Grace Period</p>
                <p className="text-yellow-800 dark:text-yellow-300">
                  Du har 30 dage til at fortryde beslutningen. Log blot ind igen for at annullere sletningen.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="delete-password" className="text-sm font-medium">
                    Bekræft med dit password
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Indtast dit password"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="delete-reason" className="text-sm font-medium">
                    Hvorfor sletter du? (valgfrit)
                  </Label>
                  <Textarea
                    id="delete-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Hjælp os med at forbedre vores service..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {error && (
                  <div className="bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-3 py-2 rounded text-sm">
                    <strong>Fejl:</strong> {error}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPassword('');
              setReason('');
              setError('');
            }}>
              Annuller
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || !password}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sletter...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ja, Slet Min Konto
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>GDPR Ret:</strong> Dette er din ret under GDPR Artikel 17 (Retten til at blive glemt). 
          Dine data vil blive permanent slettet efter grace perioden.
        </p>
      </div>
    </div>
  );
}

