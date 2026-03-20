import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Upload, FileText, File } from 'lucide-react';

const mockDocs = [
  { id: 'd1', name: 'W-4 — Marcus Williams', type: 'Tax Form', company: 'Harborview Hospitality', uploadedBy: 'Tom Nguyen', date: '2025-03-13', size: '142 KB' },
  { id: 'd2', name: 'I-9 — Priya Sharma', type: 'Employment Verification', company: 'Greenfield Manufacturing', uploadedBy: 'Sarah Chen', date: '2025-03-14', size: '256 KB' },
  { id: 'd3', name: 'Employee Handbook v2.1', type: 'Policy Document', company: 'All Companies', uploadedBy: 'Sarah Chen', date: '2025-02-20', size: '1.2 MB' },
  { id: 'd4', name: 'Workers Comp Certificate — TX', type: 'Insurance', company: 'Meridian Construction', uploadedBy: 'Sarah Chen', date: '2025-01-15', size: '89 KB' },
];

export default function Documents() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Documents"
        description="Company and employee document management"
        actions={<Button size="sm"><Upload className="h-4 w-4 mr-1.5" />Upload</Button>}
      />

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in-up stagger-1">
        <div className="divide-y">
          {mockDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer">
              <div className="rounded-lg bg-primary/10 p-2">
                {doc.type === 'Tax Form' ? <FileText className="h-5 w-5 text-primary" /> : <File className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{doc.type} · {doc.company}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{doc.date}</p>
                <p className="text-[11px] text-muted-foreground">{doc.size}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
