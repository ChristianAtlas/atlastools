import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { complianceTasks } from '@/lib/mock-data';

export default function Compliance() {
  return (
    <div className="space-y-5">
      <PageHeader title="Compliance" description="Track regulatory tasks and deadlines" />

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in-up stagger-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Task</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Company</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Assignee</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Due Date</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {complianceTasks.map(task => (
              <tr key={task.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-medium">{task.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{task.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{task.companyName || 'Platform'}</td>
                <td className="px-4 py-3 text-muted-foreground">{task.assignee}</td>
                <td className="px-4 py-3 text-muted-foreground">{task.dueDate}</td>
                <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
