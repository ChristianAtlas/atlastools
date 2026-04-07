import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Building2, Users, Send, Clock, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  useCommunicationById,
  useCommunicationRecipients,
  useUpdateCommunication,
  COMM_STATUSES,
} from '@/hooks/useCommunications';
import { useState } from 'react';

export default function CommunicationDetail() {
  const { role } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: comm, isLoading } = useCommunicationById(id);
  const { data: recipients = [] } = useCommunicationRecipients(id);
  const updateComm = useUpdateCommunication();
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  if (role && role !== 'super_admin') return <Navigate to="/" replace />;

  if (isLoading || !comm) {
    return <div className="text-center py-20 text-muted-foreground text-sm">Loading...</div>;
  }

  const statusObj = COMM_STATUSES.find(s => s.value === comm.status);
  const isEditable = comm.status === 'draft' || comm.status === 'scheduled';
  const isLocked = comm.status === 'scheduled' && comm.scheduled_at &&
    (new Date(comm.scheduled_at).getTime() - Date.now()) < (comm.lock_minutes * 60 * 1000);

  const handleCancel = async () => {
    try {
      await updateComm.mutateAsync({ id: comm.id, status: 'cancelled', cancelled_at: new Date().toISOString() } as any);
      toast.success('Communication cancelled');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSaveEdit = async () => {
    try {
      await updateComm.mutateAsync({ id: comm.id, subject: editSubject, body_html: editBody } as any);
      toast.success('Communication updated');
      setEditing(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const startEdit = () => {
    setEditSubject(comm.subject);
    setEditBody(comm.body_html);
    setEditing(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/communications')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <PageHeader title={comm.subject || '(No subject)'} description={`Communication Detail`} />
        <Badge variant="outline" className={statusObj?.color ?? ''}>{statusObj?.label ?? comm.status}</Badge>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Audience</p>
              <div className="flex items-center gap-1.5 font-medium capitalize">
                {comm.audience_type === 'company' ? <Building2 className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                {comm.audience_type}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Recipients</p>
              <p className="font-semibold text-primary tabular-nums">{comm.recipient_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{format(new Date(comm.created_at), 'MMM d, yyyy h:mm a')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Creator</p>
              <p className="font-medium">{comm.creator_name ?? '—'}</p>
            </div>
            {comm.scheduled_at && (
              <div>
                <p className="text-muted-foreground">Scheduled For</p>
                <p className="font-medium">{format(new Date(comm.scheduled_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            )}
            {comm.sent_at && (
              <div>
                <p className="text-muted-foreground">Sent At</p>
                <p className="font-medium">{format(new Date(comm.sent_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Method</p>
              <p className="font-medium capitalize">{comm.selection_method}{comm.segment_name ? `: ${comm.segment_name}` : ''}</p>
            </div>
            <div>
              <p className="text-muted-foreground">From</p>
              <p className="font-medium">{comm.from_name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Email Content</CardTitle>
            {isEditable && !isLocked && !editing && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            )}
            {isLocked && <Badge variant="outline" className="border-amber-500 text-amber-600"><Clock className="h-3 w-3 mr-1" /> Locked for sending</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <div><Label>Subject</Label><Input value={editSubject} onChange={e => setEditSubject(e.target.value)} /></div>
              <div><Label>Body</Label><Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={10} /></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={updateComm.isPending}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Subject: <span className="text-foreground font-medium">{comm.subject}</span></p>
              <Separator className="my-2" />
              <div className="bg-muted/30 rounded p-4 text-sm whitespace-pre-wrap border">{comm.body_html}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recipients ({recipients.length})</CardTitle></CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recipients recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.slice(0, 50).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.entity_label.split(' – ')[0]}</TableCell>
                    <TableCell className="text-sm">{r.entity_label.split(' – ')[1]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        r.delivery_status === 'sent' ? 'border-emerald-500 text-emerald-600' :
                        r.delivery_status === 'failed' || r.delivery_status === 'bounced' ? 'border-destructive text-destructive' :
                        'border-muted-foreground text-muted-foreground'
                      }>{r.delivery_status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {recipients.length > 50 && <p className="text-xs text-muted-foreground mt-2">Showing first 50 of {recipients.length} recipients.</p>}
        </CardContent>
      </Card>

      {/* Actions */}
      {isEditable && (
        <div className="flex justify-end gap-2">
          <Button variant="destructive" size="sm" onClick={handleCancel} disabled={updateComm.isPending}>
            <X className="h-4 w-4 mr-1" /> Cancel Communication
          </Button>
        </div>
      )}
    </div>
  );
}
