/**
 * Choose a new password. Reached from the recovery email via /auth/callback,
 * which has already exchanged the link's code for a session. Without a
 * session (expired/used link) we send the user back to request a new one.
 */

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

const MIN_LENGTH = 8;

export default function ResetPassword() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Could not update password.');
        setLoading(false);
        return;
      }
      // Full navigation so the middleware sees the session cookie.
      window.location.assign('/admin');
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-3">
          <img src="/images/Elva Logo Icon 2.svg" alt="Elva" className="h-11 w-11" />
          <span className="text-xl font-bold tracking-tight text-foreground">Elva</span>
        </div>

        {!hasSession ? (
          <div>
            <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Link expired</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This reset link is invalid or has expired. Request a new one.
            </p>
            <a
              href="/auth/forgot-password"
              className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
            >
              Request a new link
            </a>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Choose a new password</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                At least {MIN_LENGTH} characters.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full font-semibold">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
