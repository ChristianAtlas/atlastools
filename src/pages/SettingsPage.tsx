import { PageHeader } from '@/components/PageHeader';

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Platform configuration" />
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground animate-in-up stagger-1">
        <p className="text-sm">Settings panel — coming soon.</p>
        <p className="text-xs mt-1">Platform configuration, API keys, and user management will live here.</p>
      </div>
    </div>
  );
}
