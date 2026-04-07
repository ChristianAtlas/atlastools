import { ComplianceStatusCard } from './ComplianceStatusCard';
import { ComplianceScoreBadge } from './ComplianceScoreBadge';
import { AlertsFeed } from './AlertsFeed';
import { computeComplianceScore, type ComplianceItem, type ComplianceLicense } from '@/hooks/useCompliance';

interface Props {
  items: ComplianceItem[];
  licenses: ComplianceLicense[];
}

export function RiskDashboard({ items, licenses }: Props) {
  const compliant = items.filter(i => i.status === 'compliant' || i.status === 'waived').length;
  const atRisk = items.filter(i => i.status === 'at_risk').length;
  const nonCompliant = items.filter(i => i.status === 'non_compliant' || i.status === 'expired').length;
  const pending = items.filter(i => i.status === 'pending' || i.status === 'in_progress').length;
  const expiring = licenses.filter(l => l.status === 'expiring').length;
  const expired = licenses.filter(l => l.status === 'expired').length;
  const score = computeComplianceScore(items);

  // Group scores by company
  const companyScores = new Map<string, { name: string; items: ComplianceItem[] }>();
  items.filter(i => i.entity_type === 'client' && i.company_id).forEach(item => {
    const existing = companyScores.get(item.company_id!);
    if (existing) existing.items.push(item);
    else companyScores.set(item.company_id!, { name: item.company_id!, items: [item] });
  });

  return (
    <div className="space-y-6">

      {companyScores.size > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Client Compliance Scores</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from(companyScores.entries()).map(([companyId, data]) => {
              const clientScore = computeComplianceScore(data.items);
              return (
                <div key={companyId} className="rounded-lg border p-3 bg-card flex items-center gap-3">
                  <ComplianceScoreBadge score={clientScore} size="sm" showLabel={false} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{data.name}</p>
                    <p className="text-xs text-muted-foreground">{data.items.length} items</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-3">Compliance Alerts</h3>
        <AlertsFeed />
      </div>
    </div>
  );
}
