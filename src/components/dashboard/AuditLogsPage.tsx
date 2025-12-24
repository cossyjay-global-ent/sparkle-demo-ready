import { useState, useEffect } from 'react';
import { useRBAC } from '@/contexts/RBACContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Search, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { AuditLog } from '@/lib/database';
import { format } from 'date-fns';

export default function AuditLogsPage() {
  const { isAdmin, getAuditLogs } = useRBAC();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    const data = await getAuditLogs();
    setLogs(data);
    setIsLoading(false);
  };

  const formatDateTime = (timestamp: number) => {
    return format(new Date(timestamp), 'd/M/yyyy, h:mm:ss a');
  };

  const getActionBadge = (action: AuditLog['action']) => {
    const variants: Record<string, { color: string; label: string }> = {
      create: { color: 'bg-emerald-500/20 text-emerald-500', label: 'Create' },
      update: { color: 'bg-blue-500/20 text-blue-500', label: 'Update' },
      delete: { color: 'bg-red-500/20 text-red-500', label: 'Delete' },
      login: { color: 'bg-purple-500/20 text-purple-500', label: 'Login' },
      logout: { color: 'bg-gray-500/20 text-gray-500', label: 'Logout' },
      role_change: { color: 'bg-orange-500/20 text-orange-500', label: 'Role Change' },
      payment: { color: 'bg-cyan-500/20 text-cyan-500', label: 'Payment' },
      sync: { color: 'bg-indigo-500/20 text-indigo-500', label: 'Sync' },
    };
    const variant = variants[action] || { color: 'bg-gray-500/20 text-gray-500', label: action };
    return <Badge className={`${variant.color} border-0`}>{variant.label}</Badge>;
  };

  const filteredLogs = logs.filter(log =>
    log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to view audit logs. Only administrators can access this page.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">Immutable record of all system actions</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search logs by user, action, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 input-styled"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Total Actions</p>
          <p className="text-2xl font-bold text-foreground">{logs.length}</p>
        </Card>
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Creates</p>
          <p className="text-2xl font-bold text-emerald-500">
            {logs.filter(l => l.action === 'create').length}
          </p>
        </Card>
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Updates</p>
          <p className="text-2xl font-bold text-blue-500">
            {logs.filter(l => l.action === 'update').length}
          </p>
        </Card>
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Deletes</p>
          <p className="text-2xl font-bold text-red-500">
            {logs.filter(l => l.action === 'delete').length}
          </p>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-pulse">Loading audit logs...</div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Shield className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No audit logs found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="table-row-hover">
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium">{log.userEmail}</TableCell>
                    <TableCell>
                      <Badge variant={log.userRole === 'admin' ? 'default' : 'secondary'}>
                        {log.userRole}
                      </Badge>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="text-muted-foreground">{log.tableName}</TableCell>
                    <TableCell className="max-w-xs truncate" title={log.description}>
                      {log.description}
                    </TableCell>
                    <TableCell>
                      {log.mode === 'online' ? (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <Wifi className="w-3 h-3" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-500">
                          <WifiOff className="w-3 h-3" /> Offline
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}