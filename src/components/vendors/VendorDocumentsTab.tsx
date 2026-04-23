import { useState } from 'react';
import { Upload, FileText, Download, Trash2, ShieldCheck } from 'lucide-react';
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
  const { data: docs, isLoading } = useVendorDocuments(vendor.id);
  const upload = useUploadVendorDocument();
  const remove = useDeleteVendorDocument();

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
    try {
      const url = await getVendorDocumentSignedUrl(doc.file_path, 60);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not generate download link');
    }
  };

  const handleDelete = async (doc: VendorDocumentRow) => {
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Vendor documents</h3>
          <p className="text-xs text-muted-foreground">
            W-9, MSA, COI, and other supporting files. Files are private and only visible to your company.
          </p>
        </div>
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
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !docs || docs.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {docs.map((d) => {
            const typeLabel = VENDOR_DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type;
            return (
              <div key={d.id} className="flex items-center gap-3 p-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{d.title}</span>
                    <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                    {d.document_type === 'w9' && (
                      <Badge variant="secondary" className="text-[10px]">
                        <ShieldCheck className="mr-1 h-3 w-3" />W-9
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {d.file_name} · {fmtBytes(d.file_size)} · uploaded {new Date(d.created_at).toLocaleDateString()}
                    {d.uploaded_by_name ? ` by ${d.uploaded_by_name}` : ''}
                  </div>
                  {d.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{d.notes}</div>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleDownload(d)} disabled={!d.file_path}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(d)} disabled={remove.isPending}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}