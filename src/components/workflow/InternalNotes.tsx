import { useState } from 'react';
import { cn } from '@/lib/utils';
import { StickyNote, Send, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface InternalNote {
  id: string;
  author: string;
  authorRole: string;
  content: string;
  jiraRef?: string;
  createdAt: string;
}

interface InternalNotesProps {
  notes: InternalNote[];
  onAddNote?: (content: string, jiraRef?: string) => void;
  canAdd?: boolean;
  className?: string;
}

export function InternalNotes({ notes, onAddNote, canAdd = true, className }: InternalNotesProps) {
  const [newNote, setNewNote] = useState('');
  const [jiraRef, setJiraRef] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    onAddNote?.(newNote.trim(), jiraRef.trim() || undefined);
    setNewNote('');
    setJiraRef('');
    setIsAdding(false);
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4 text-warning" />
          Internal Notes
          <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            Staff Only
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Existing notes */}
        {notes.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground py-2">No internal notes yet.</p>
        )}

        {notes.map(note => (
          <div key={note.id} className="rounded-md border border-warning/20 bg-warning/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <StickyNote className="h-3 w-3 text-warning" />
                <span className="text-sm font-medium">{note.author}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{note.authorRole}</span>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{note.content}</p>
            {note.jiraRef && (
              <div className="flex items-center gap-1 text-xs text-info">
                <ExternalLink className="h-3 w-3" />
                <span className="font-medium">{note.jiraRef}</span>
              </div>
            )}
          </div>
        ))}

        {/* Add note form */}
        {canAdd && !isAdding && (
          <Button variant="outline" size="sm" className="h-8 text-xs w-full" onClick={() => setIsAdding(true)}>
            <StickyNote className="h-3.5 w-3.5 mr-1.5" />
            Add Internal Note
          </Button>
        )}

        {isAdding && (
          <div className="space-y-2 rounded-md border p-3 bg-muted/20">
            <Textarea
              placeholder="Write an internal note (not visible to clients)..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              rows={3}
              className="text-sm"
              autoFocus
            />
            <Input
              placeholder="Jira ticket reference (optional, e.g. ATLAS-1234)"
              value={jiraRef}
              onChange={e => setJiraRef(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSubmit} disabled={!newNote.trim()}>
                <Send className="h-3.5 w-3.5" />
                Save Note
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setIsAdding(false); setNewNote(''); setJiraRef(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
