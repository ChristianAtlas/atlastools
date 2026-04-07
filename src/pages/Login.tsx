import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Shield, Building2, User, Mail, Lock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { lovable } from '@/integrations/lovable/index';
import logoImg from '@/assets/logo.png';

interface DemoAccount {
  label: string;
  description: string;
  icon: React.ElementType;
  email: string;
  password: string;
  full_name: string;
  role: string;
  company_id?: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Super Admin',
    description: 'Platform-wide access',
    icon: Shield,
    email: 'demo@atlasone.hr',
    password: 'demo-password-2024',
    full_name: 'Demo Admin',
    role: 'super_admin',
  },
  {
    label: 'Payroll Admin',
    description: 'Acme Corp admin',
    icon: Building2,
    email: 'demo-admin@acme.test',
    password: 'demo-password-2024',
    full_name: 'Jordan Rivera',
    role: 'client_admin',
    company_id: 'd5415c8f-a972-4d62-998a-7468fc913578',
  },
  {
    label: 'Employee',
    description: 'Acme Corp employee',
    icon: User,
    email: 'demo-employee@acme.test',
    password: 'demo-password-2024',
    full_name: 'Alex Chen',
    role: 'employee',
    company_id: 'd5415c8f-a972-4d62-998a-7468fc913578',
  },
];

const FEATURE_CARDS = [
  'Email/password login for your team',
  'Secure redirect handling',
  'Profiles are created automatically on signup',
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: 'Google sign-in failed', description: String(result.error), variant: 'destructive' });
        return;
      }
      if (result.redirected) return;
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Google sign-in failed', description: err.message, variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

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

  const handleDemoLogin = async (account: DemoAccount) => {
    setDemoLoading(account.email);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (!signInError) {
      setDemoLoading(null);
      navigate('/');
      return;
    }
    try {
      const { error: fnError } = await supabase.functions.invoke('provision-demo-user', {
        body: {
          email: account.email,
          password: account.password,
          full_name: account.full_name,
          role: account.role,
          company_id: account.company_id || null,
        },
      });
      if (fnError) throw fnError;
      const { error: finalError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (finalError) throw finalError;
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Demo login failed', description: err.message, variant: 'destructive' });
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navbar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-border z-20">
        <a
          href="https://www.atlasonehr.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5"
        >
          <img src={logoImg} alt="AtlasOne" className="h-8 w-8" />
          <span className="text-lg font-semibold text-foreground">AtlasOne</span>
        </a>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Left: Blue hero panel */}
        <div
          className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-foreground relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, hsl(200 70% 72%), hsl(205 75% 80%))',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/10" />
          <div className="absolute bottom-10 -left-20 w-64 h-64 rounded-full bg-white/8" />
          <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-white/6" />

          <div className="relative z-10 mt-8">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-foreground/70 mb-4">
              Account Access
            </p>
            <h1 className="text-5xl font-bold leading-[1.1] text-foreground mb-6">
              Log in without the payroll headache.
            </h1>
            <p className="text-base text-foreground/70 max-w-md leading-relaxed">
              Access AtlasOne with email and password or continue with Google.
              Your account details stay protected and your profile is created automatically.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3">
            {FEATURE_CARDS.map((text) => (
              <div
                key={text}
                className="rounded-xl bg-foreground/5 backdrop-blur-sm border border-foreground/10 p-4"
              >
                <p className="text-sm font-medium text-foreground/80">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="flex items-center gap-2.5 mb-8 lg:hidden">
              <a
                href="https://www.atlasonehr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5"
              >
                <img src={logoImg} alt="AtlasOne" className="h-8 w-8" />
                <span className="text-lg font-semibold text-foreground">AtlasOne</span>
              </a>
            </div>

            {/* Card */}
            <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
              {/* Tabs */}
              <div className="flex rounded-xl bg-muted p-1 mb-8">
                <div className="flex-1 text-center py-2.5 text-sm font-medium rounded-lg bg-card shadow-sm text-foreground">
                  Log in
                </div>
                <Link
                  to="/signup"
                  className="flex-1 text-center py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  Create account
                </Link>
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back.</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Sign in to continue to your workspace.
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
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

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
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
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">
                  demo access
                </span>
              </div>

              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-3 h-11 text-sm"
                    disabled={demoLoading !== null}
                    onClick={() => handleDemoLogin(account)}
                  >
                    <account.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{account.label}</span>
                    <span className="text-muted-foreground text-xs ml-auto">
                      {demoLoading === account.email ? 'Signing in…' : account.description}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground/60 text-center mt-6">
              <a
                href="https://www.atlasonehr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                atlasonehr.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
