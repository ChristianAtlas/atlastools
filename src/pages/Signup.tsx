import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';
import logoImg from '@/assets/logo.png';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent you a confirmation link to verify your account.' });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Hero panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 text-white relative overflow-hidden"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute top-1/4 right-10 w-48 h-48 rounded-full bg-white/8" />
        <div className="absolute bottom-20 left-1/4 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/6" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="AtlasOne" className="h-8 w-8 invert brightness-200" />
            <span className="text-lg font-semibold">AtlasOne</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Join teams who traded chaos for{' '}
            <span className="gradient-text">clarity.</span>
          </h1>
          <p className="text-white/80 text-base leading-relaxed">
            Set up your AtlasOne portal and get your team running in minutes — not months.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-sm text-white/70">
          <span>No credit card required</span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span>Free onboarding</span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span>Cancel anytime</span>
        </div>
      </div>

      {/* Right: Signup form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <img src={logoImg} alt="AtlasOne" className="h-8 w-8" />
            <span className="text-lg font-semibold text-foreground">AtlasOne</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground">Create your account</h2>
            <p className="text-sm text-muted-foreground mt-1">Get started with AtlasOne HR</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="Jane Smith" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>

            <Button
              type="submit"
              className="w-full gap-2 h-11 text-sm font-medium"
              style={{ background: 'var(--gradient-primary)' }}
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create Account'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-medium hover:underline" style={{ color: 'hsl(var(--primary))' }}>
              Sign in
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
