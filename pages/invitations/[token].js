/**
 * Invitation Acceptance Page
 * 
 * Public page where users can accept or decline team invitations
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  Building2,
  UserPlus,
  AlertCircle,
  ArrowRight,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

export default function InvitationPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { token } = router.query;

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountData, setAccountData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invitations/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load invitation');
        return;
      }

      setInvitation(data);
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (status === 'unauthenticated') {
      // Show create account form instead of redirecting to login
      setShowCreateAccount(true);
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await fetch(`/api/invitations/${token}?action=accept`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      setSuccess('Invitation accepted successfully!');
      
      // Redirect to organization after a short delay
      setTimeout(() => {
        router.push('/admin');
      }, 2000);

    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!accountData.name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (accountData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (accountData.password !== accountData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check invitation email exists
    if (!invitation?.invitation?.email) {
      setError('Invitation email not found. Please refresh and try again.');
      console.error('Invitation object:', invitation);
      return;
    }

    setProcessing(true);

    try {
      // Create the user account
      const requestBody = {
        email: invitation?.invitation?.email,
        name: accountData.name,
        password: accountData.password,
        invitationToken: token
      };

      console.log('Creating account with:', { email: requestBody.email, name: requestBody.name });

      const createResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        console.error('Registration failed:', createData);
        setError(createData.error || 'Failed to create account');
        setProcessing(false);
        return;
      }

      // Sign in with the new credentials
      const result = await signIn('credentials', {
        redirect: false,
        email: invitation?.invitation?.email,
        password: accountData.password,
      });

      if (result.error) {
        setError('Account created but failed to sign in. Please try logging in.');
        setProcessing(false);
        return;
      }

      // Account created and invitation already accepted during registration
      console.log('✅ Account created and invitation accepted automatically');
      setSuccess('Account created and invitation accepted! Redirecting...');
      
      // Wait for session to update, then redirect
      setTimeout(() => {
        router.push('/admin');
      }, 1500);

    } catch (err) {
      console.error('Error creating account:', err);
      setError('An unexpected error occurred');
      setProcessing(false);
    }
  };

  const handleSignInInstead = () => {
    signIn(undefined, { callbackUrl: `/invitations/${token}` });
  };

  const handleDecline = async () => {
    if (status === 'unauthenticated') {
      // Just show a message for unauthenticated users
      router.push('/admin/login');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await fetch(`/api/invitations/${token}?action=decline`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to decline invitation');
        return;
      }

      setSuccess('Invitation declined.');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin');
      }, 2000);

    } catch (err) {
      console.error('Error declining invitation:', err);
      setError('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 pb-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              This invitation link is not valid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.push('/admin/login')} 
              className="w-full"
              variant="outline"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              {success}
            </CardTitle>
            <CardDescription>
              Redirecting you to the dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main invitation display
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">
            {showCreateAccount ? 'Create Your Account' : 'Team Invitation'}
          </h1>
          <p className="text-muted-foreground">
            {showCreateAccount 
              ? 'Set up your account to join the team' 
              : "You've been invited to join a team"
            }
          </p>
        </div>

        {/* Invitation Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle>{invitation?.organization?.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="capitalize">
                    {invitation?.organization?.plan || 'free'}
                  </Badge>
                </CardDescription>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Invited by:</span>
                <span className="font-medium">{invitation?.inviter?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Role:</span>
                <Badge className="capitalize">{invitation?.invitation?.role}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Expires:</span>
                <span>{new Date(invitation?.invitation?.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {showCreateAccount ? (
              /* Create Account Form */
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={invitation?.invitation?.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the email address the invitation was sent to
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={accountData.name}
                    onChange={(e) => setAccountData({...accountData, name: e.target.value})}
                    required
                    disabled={processing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={accountData.password}
                      onChange={(e) => setAccountData({...accountData, password: e.target.value})}
                      required
                      minLength={8}
                      disabled={processing}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={processing}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={accountData.confirmPassword}
                    onChange={(e) => setAccountData({...accountData, confirmPassword: e.target.value})}
                    required
                    disabled={processing}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account & Join Team
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <Separator />

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => signIn('google', { callbackUrl: `/invitations/${token}` })}
                    disabled={processing}
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                    Sign up with Google
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleSignInInstead}
                      disabled={processing}
                      className="text-sm"
                    >
                      Already have an account? Sign in instead
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              /* Accept/Decline Invitation */
              <>
                {/* Email mismatch warning */}
                {status === 'authenticated' && session?.user?.email?.toLowerCase() !== invitation?.invitation?.email?.toLowerCase() && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This invitation was sent to <strong>{invitation?.invitation?.email}</strong> but you're logged in as <strong>{session.user.email}</strong>.
                      You need to log in with the invited email address.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleDecline}
                    variant="outline"
                    className="flex-1"
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Decline'
                    )}
                  </Button>
                  <Button
                    onClick={handleAccept}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={processing || (status === 'authenticated' && session?.user?.email?.toLowerCase() !== invitation?.invitation?.email?.toLowerCase())}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : status === 'authenticated' ? (
                      <>
                        Accept Invitation
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Create Account & Accept
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                {status === 'unauthenticated' && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      New to the platform?
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleSignInInstead}
                      className="text-sm"
                    >
                      Already have an account? Sign in instead
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by Elva Solutions
        </p>
      </div>
    </div>
  );
}

