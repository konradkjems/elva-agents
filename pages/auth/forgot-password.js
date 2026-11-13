/**
 * Public "forgot password" page. Sends a Supabase recovery email whose link
 * lands on /auth/callback (which exchanges the PKCE code for a session) and
 * then forwards to /auth/reset-password to choose a new password.
 *
 * Lives outside /admin so the auth middleware doesn't gate it.
 */

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, MailCheck, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      );
      // Only surface rate-limit style errors; never reveal whether an account exists.
      if (resetError && resetError.status === 429) {
        setError('Too many requests. Please wait a minute and try again.');
      } else {
        setSent(true);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-3">
          <img src="/images/Elva Logo Icon 2.svg" alt="Elva" className="h-11 w-11" />
          <span className="text-xl font-bold tracking-tight text-foreground">Elva</span>
        </div>

        {sent ? (
          <div>
            <MailCheck className="mb-4 h-10 w-10 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Check your email</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              If an account exists for <strong>{email.trim().toLowerCase()}</strong>, we've sent a
              link to reset your password. Open it in this browser.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Reset your password</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your email and we'll send you a reset link.
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
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full font-semibold">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>
          </>
        )}

        <a
          href="/admin/login"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </a>
      </div>
    </div>
  );
}
