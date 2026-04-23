import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import logoImg from '@/assets/logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Could not send reset email', description: error.message, variant: 'destructive' });
      return;
    }
    setSent(true);
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
            {sent ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <span className="font-medium text-foreground">{email}</span>,
                  we've sent a password reset link. The link expires in 1 hour.
                </p>
                <p className="text-xs text-muted-foreground">
                  Didn't get it? Check your spam folder, or{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setSent(false)}
                  >
                    try again
                  </button>
                  .
                </p>
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link to="/login">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to sign in
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-1">Reset your password</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Enter the email tied to your AtlasOne account and we'll send you a secure link to choose a new password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
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
                    {loading ? 'Sending…' : 'Send reset link'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}