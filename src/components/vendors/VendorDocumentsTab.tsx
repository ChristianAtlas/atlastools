import { useState } from 'react';
import { Upload, FileText, Download, Trash2, ShieldCheck, Lock, History, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  useVendorDocuments,
  useUploadVendorDocument,
  useDeleteVendorDocument,
  getVendorDocumentSignedUrl,
  VENDOR_DOCUMENT_TYPES,
  type VendorDocumentRow,
  type VendorDocumentType,
  type VendorRow,
} from '@/hooks/useVendors';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

function fmtBytes(n: number | null) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function VendorDocumentsTab({ vendor }: { vendor: VendorRow }) {
  const { isSuperAdmin, isClientAdmin, profile } = useAuth();
  // Admins (super admin or client admin of the vendor's company) can manage docs.
  // Other roles get a read-only view with redacted download access.
  const canManage =
    isSuperAdmin ||
    (isClientAdmin && profile?.company_id === vendor.company_id);
  const canDownload = canManage; // employees should not view sensitive vendor PII
  const { data: docs, isLoading } = useVendorDocuments(vendor.id);
  const upload = useUploadVendorDocument();
  const remove = useDeleteVendorDocument();

  // Split W-9s out for the history view; keep everything else in the generic list.
  const w9History = (docs ?? [])
    .filter((d) => d.document_type === 'w9')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const otherDocs = (docs ?? []).filter((d) => d.document_type !== 'w9');
  const activeW9 = w9History.find((d) => d.is_active_w9);

  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<VendorDocumentType>('w9');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [markW9, setMarkW9] = useState(true);
  const [w9Expires, setW9Expires] = useState('');

  const reset = () => {
    setDocType('w9');
    setTitle('');
    setNotes('');
    setFile(null);
    setMarkW9(true);
    setW9Expires('');
  };

  const handleSubmit = async () => {
    if (!canManage) {
      toast.error('You do not have permission to upload vendor documents');
      return;
    }
    if (!file) {
      toast.error('Choose a file to upload');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('File exceeds 10 MB limit');
      return;
    }
    if (file.type && !ACCEPTED.includes(file.type)) {
      toast.error('Only PDF, PNG, or JPG files are allowed');
      return;
    }
    // W-9 expiration sanity check (must be in the future)
    if (docType === 'w9' && markW9 && w9Expires) {
      const exp = new Date(w9Expires);
      const today = new Date(new Date().toDateString());
      if (Number.isNaN(exp.getTime()) || exp < today) {
        toast.error('W-9 expiration must be a future date');
        return;
      }
    }
    try {
      await upload.mutateAsync({
        vendor_id: vendor.id,
        company_id: vendor.company_id,
        document_type: docType,
        title: title.trim() || VENDOR_DOCUMENT_TYPES.find((t) => t.value === docType)!.label,
        notes: notes.trim() || null,
        file,
        mark_w9_collected: docType === 'w9' && markW9,
        w9_expires_at: docType === 'w9' && markW9 && w9Expires ? w9Expires : null,
      });
      toast.success('Document uploaded');
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    }
  };

  const handleDownload = async (doc: VendorDocumentRow) => {
    if (!doc.file_path) return;
    if (!canDownload) {
      toast.error('You do not have permission to view this document');
      return;
    }
    try {
      const url = await getVendorDocumentSignedUrl(doc.file_path, 60);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not generate download link');
    }
  };

  const handleDelete = async (doc: VendorDocumentRow) => {
    if (!canManage) {
      toast.error('You do not have permission to delete vendor documents');
      return;
    }
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await remove.mutateAsync(doc);
      toast.success('Document deleted');
    } catch (e: any) {
      toast.error(e?.message ?? 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      {!canManage && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          Read-only view. Only client admins or AtlasOne staff can upload or remove vendor documents.
        </div>
      )}
      {canManage && vendor.w9_status !== 'on_file' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-destructive" />
            <span>
              <strong>W-9 not on file.</strong> Upload the signed W-9 to unlock vendor payments.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setDocType('w9'); setMarkW9(true); setOpen(true); }}>
            Upload W-9
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Vendor documents</h3>
          <p className="text-xs text-muted-foreground">
            W-9, MSA, COI, and other supporting files. Files are private and only visible to your company.
          </p>
        </div>
        {canManage && (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Upload className="mr-2 h-4 w-4" />Upload document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload vendor document</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Document type</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as VendorDocumentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., 2026 Form W-9" />
              </div>
              <div>
                <Label>File</Label>
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">PDF, PNG, or JPG · max 10 MB</p>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              {docType === 'w9' && (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={markW9} onCheckedChange={(v) => setMarkW9(!!v)} />
                    Mark W-9 as on file
                  </label>
                  {markW9 && (
                    <div>
                      <Label className="text-xs">W-9 expires (optional)</Label>
                      <Input type="date" value={w9Expires} onChange={(e) => setW9Expires(e.target.value)} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={upload.isPending}>
                {upload.isPending ? 'Uploading…' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !docs || docs.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No documents uploaded yet.
        </div>
      ) : (
        <>
          {w9History.length > 0 && (
            <div className="rounded-md border">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <History className="h-4 w-4" />
                  W-9 history
                  <Badge variant="outline" className="text-[10px]">{w9History.length}</Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Only the most recent W-9 is active. Older versions are kept for audit.
                </span>
              </div>
              <div className="divide-y">
                {w9History.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{d.title}</span>
                        {d.is_active_w9 ? (
                          <Badge className="text-[10px] bg-success/15 text-success border-success/30 hover:bg-success/15">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Active · on file
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Superseded</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.file_name ?? '—'} · {fmtBytes(d.file_size)} · uploaded{' '}
                        {new Date(d.created_at).toLocaleString()}
                        {d.uploaded_by_name ? ` · marked on file by ${d.uploaded_by_name}` : ''}
                      </div>
                      {d === activeW9 && vendor.w9_expires_at && (
                        <div className="text-[11px] text-muted-foreground">
                          Expires {new Date(vendor.w9_expires_at).toLocaleDateString()}
                        </div>
                      )}
                      {d.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{d.notes}</div>}
                    </div>
                    {canDownload && (
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(d)} disabled={!d.file_path}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {canManage && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(d)} disabled={remove.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {otherDocs.length > 0 && (
        <div className="rounded-md border divide-y">
          {otherDocs.map((d) => {
            const typeLabel = VENDOR_DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type;
            return (
              <div key={d.id} className="flex items-center gap-3 p-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{d.title}</span>
                    <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {d.file_name} · {fmtBytes(d.file_size)} · uploaded {new Date(d.created_at).toLocaleDateString()}
                    {d.uploaded_by_name ? ` by ${d.uploaded_by_name}` : ''}
                  </div>
                  {d.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{d.notes}</div>}
                </div>
                {canDownload && (
                  <Button size="sm" variant="ghost" onClick={() => handleDownload(d)} disabled={!d.file_path}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {canManage && (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(d)} disabled={remove.isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
          )}
        </>
      )}
    </div>
  );
}