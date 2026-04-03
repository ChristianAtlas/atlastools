import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Zap, ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import logoImg from '@/assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const DEMO_EMAIL = 'demo@atlasone.hr';
  const DEMO_PASSWORD = 'demo-password-2024';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      navigate('/');
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (!signInError) {
      setDemoLoading(false);
      navigate('/');
      return;
    }
    // Auto-register demo user
    const { error: signUpError } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      options: { data: { full_name: 'Demo Admin' } },
    });
    if (signUpError) {
      setDemoLoading(false);
      toast({ title: 'Demo login failed', description: signUpError.message, variant: 'destructive' });
      return;
    }
    const { error: finalError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    setDemoLoading(false);
    if (finalError) {
      toast({ title: 'Demo login failed', description: finalError.message, variant: 'destructive' });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Hero panel matching website gradient */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 text-white relative overflow-hidden"
        style={{ background: 'var(--gradient-hero)' }}
      >
        {/* Decorative circles — mirroring website hero */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute top-1/4 right-10 w-48 h-48 rounded-full bg-white/8" />
        <div className="absolute bottom-20 left-1/4 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/6" />
        <div className="absolute top-1/2 left-10 w-20 h-20 rounded-full bg-white/12" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="AtlasOne" className="h-8 w-8 invert brightness-200" />
            <span className="text-lg font-semibold">AtlasOne</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Payroll that doesn't{' '}
            <span className="gradient-text">make you cry.</span>
          </h1>
          <p className="text-white/80 text-base leading-relaxed">
            Payroll, benefits, compliance — all in one place. No spreadsheets, no hold music. Just payroll that actually works.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-sm text-white/70">
          <span>Tailored onboarding</span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span>Transparent pricing</span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span>Expert support</span>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <img src={logoImg} alt="AtlasOne" className="h-8 w-8" />
            <span className="text-lg font-semibold text-foreground">AtlasOne</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your AtlasOne portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <Button
              type="submit"
              className="w-full gap-2 h-11 text-sm font-medium"
              style={{ background: 'var(--gradient-primary)' }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="relative my-6">
            <Separator />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 h-11 text-sm"
            disabled={demoLoading}
            onClick={handleDemoLogin}
          >
            <Zap className="h-4 w-4" />
            {demoLoading ? 'Signing in…' : 'Demo Login'}
          </Button>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium hover:underline" style={{ color: 'hsl(var(--primary))' }}>
              Sign up
            </Link>
          </p>

          <p className="text-xs text-muted-foreground/60 text-center mt-8">
            <a href="https://www.atlasonehr.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
              atlasonehr.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
