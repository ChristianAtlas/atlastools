import { useState } from 'react';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import {
  useVendorDocuments,
  useUploadVendorDocument,
  getVendorDocumentSignedUrl,
  VENDOR_DOCUMENT_TYPES,
  type VendorDocumentType,
  type VendorDocumentRow,
} from '@/hooks/useVendors';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

export default function ContractorDocuments() {
  const { data: vendor } = useCurrentVendor();
  const { data: docs, isLoading } = useVendorDocuments(vendor?.id);
  const upload = useUploadVendorDocument();

  const [docType, setDocType] = useState<VendorDocumentType>('w9');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');

  const activeW9 = (docs ?? []).find((d) => d.document_type === 'w9' && d.is_active_w9);
  const w9History = (docs ?? []).filter((d) => d.document_type === 'w9' && !d.is_active_w9);

  async function handleUpload() {
    if (!vendor || !file) return;
    try {
      await upload.mutateAsync({
        vendor_id: vendor.id,
        company_id: vendor.company_id,
        document_type: docType,
        title: title || file.name,
        file,
      });
      toast.success('Document uploaded');
      setFile(null);
      setTitle('');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    }
  }

  async function handleDownload(doc: VendorDocumentRow) {
    if (!doc.file_path) return;
    try {
      const url = await getVendorDocumentSignedUrl(doc.file_path, 60);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e?.message || 'Could not open file');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Documents" description="Upload your W-9, COI, and other compliance documents" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-sm font-medium">Upload a document</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as VendorDocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VENDOR_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Title (optional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2026 W-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">File</Label>
              <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <Button onClick={handleUpload} disabled={!file || upload.isPending}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
          {docType === 'w9' && (
            <p className="text-xs text-muted-foreground">
              Uploading a new W-9 will automatically replace the active one. Previous W-9s remain in your history.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="text-sm font-medium">Active W-9</h2>
            {activeW9 ? <Badge>On file</Badge> : <Badge variant="secondary">Not collected</Badge>}
          </div>
          {activeW9 ? (
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{activeW9.title}</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {new Date(activeW9.created_at).toLocaleDateString()} by {activeW9.uploaded_by_name ?? 'unknown'}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleDownload(activeW9)}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">No W-9 on file. Upload one above.</div>
          )}
        </CardContent>
      </Card>

      {w9History.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b"><h2 className="text-sm font-medium">W-9 history</h2></div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {w9History.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.title}</TableCell>
                    <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{d.uploaded_by_name ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(d)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b"><h2 className="text-sm font-medium">Other documents</h2></div>
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(docs ?? []).filter((d) => d.document_type !== 'w9').length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No other documents uploaded.</TableCell></TableRow>
                ) : (
                  (docs ?? []).filter((d) => d.document_type !== 'w9').map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="uppercase text-xs">{d.document_type}</TableCell>
                      <TableCell>{d.title}</TableCell>
                      <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(d)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}