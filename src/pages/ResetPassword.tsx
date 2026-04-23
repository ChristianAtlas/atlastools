import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import logoImg from '@/assets/logo.png';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkValid, setLinkValid] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase recovery link: user is auto-signed-in via PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setLinkValid(true);
      }
    });
    // Check if there's already a session (link was just consumed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const hasRecoveryHash =
        typeof window !== 'undefined' &&
        (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token'));
      if (session || hasRecoveryHash) {
        setLinkValid(true);
      } else {
        setLinkValid(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'Could not update password', description: error.message, variant: 'destructive' });
      return;
    }
    setDone(true);
    // Sign out so the user re-authenticates with the new password
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/login');
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
        <Link to="/login" className="flex items-center gap-2.5">
          <img src={logoImg} alt="AtlasOne" className="h-8 w-8" />
          <span className="text-lg font-semibold text-foreground">AtlasOne</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
            {linkValid === false && !done && (
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Reset link invalid or expired</h2>
                <p className="text-sm text-muted-foreground">
                  Password reset links expire after 1 hour and can only be used once. Please request a new one.
                </p>
                <Button asChild className="w-full" style={{ background: 'var(--gradient-primary)' }}>
                  <Link to="/forgot-password">Request a new link</Link>
                </Button>
              </div>
            )}

            {linkValid === true && !done && (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-1">Choose a new password</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Set a strong password for your account. You'll be signed back in afterward.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">Confirm new password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm"
                        type="password"
                        placeholder="Re-enter password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        minLength={8}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-medium"
                    style={{ background: 'var(--gradient-primary)' }}
                    disabled={loading}
                  >
                    {loading ? 'Updating…' : 'Update password'}
                  </Button>
                </form>
              </>
            )}

            {done && (
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Password updated</h2>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to sign in with your new password…
                </p>
              </div>
            )}

            {linkValid === null && !done && (
              <p className="text-sm text-muted-foreground text-center">Verifying reset link…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}