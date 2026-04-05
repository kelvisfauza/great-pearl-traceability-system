import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, CheckCircle2, XCircle, Search, RefreshCw, Clock, Filter } from 'lucide-react';
import { format, subDays, subHours } from 'date-fns';

const EmailTracker = () => {
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const getStartDate = () => {
    switch (timeRange) {
      case '24h': return subHours(new Date(), 24).toISOString();
      case '7d': return subDays(new Date(), 7).toISOString();
      case '30d': return subDays(new Date(), 30).toISOString();
      case 'all': return '2020-01-01T00:00:00Z';
      default: return subDays(new Date(), 7).toISOString();
    }
  };

  const { data: emails, isLoading, refetch } = useQuery({
    queryKey: ['sent-emails', timeRange, templateFilter, statusFilter, searchQuery, page],
    queryFn: async () => {
      let query = (supabase as any).from('sent_emails_log')
        .select('*', { count: 'exact' })
        .gte('created_at', getStartDate())
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (templateFilter !== 'all') {
        query = query.eq('template_name', templateFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchQuery.trim()) {
        query = query.ilike('recipient_email', `%${searchQuery.trim()}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { emails: data || [], total: count || 0 };
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['email-templates-list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('sent_emails_log')
        .select('template_name')
        .limit(1000);
      if (error) return [];
      const unique = [...new Set((data || []).map((d: any) => d.template_name))].sort();
      return unique as string[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['email-stats', timeRange],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('sent_emails_log')
        .select('status')
        .gte('created_at', getStartDate());
      if (error) return { total: 0, sent: 0, failed: 0 };
      const all = data || [];
      return {
        total: all.length,
        sent: all.filter((e: any) => e.status === 'sent').length,
        failed: all.filter((e: any) => e.status === 'failed').length,
      };
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  const formatTemplateName = (name: string) => {
    return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const totalPages = Math.ceil((emails?.total || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Tracker
          </h2>
          <p className="text-sm text-muted-foreground">Monitor all sent transactional emails</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Emails</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-green-600">{stats?.sent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats?.failed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <div className="flex gap-1">
              {['24h', '7d', '30d', 'all'].map(range => (
                <Button
                  key={range}
                  size="sm"
                  variant={timeRange === range ? 'default' : 'outline'}
                  onClick={() => { setTimeRange(range); setPage(0); }}
                  className="text-xs"
                >
                  {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                </Button>
              ))}
            </div>

            <Select value={templateFilter} onValueChange={v => { setTemplateFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Templates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {(templates || []).map(t => (
                  <SelectItem key={t} value={t}>{formatTemplateName(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Email Log {emails?.total ? `(${emails.total} total)` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (emails?.emails?.length || 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No emails found</p>
              <p className="text-sm">Emails will appear here once they are sent from the system</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emails.emails.map((email: any) => (
                      <TableRow key={email.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-mono">
                            {formatTemplateName(email.template_name)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{email.recipient_email}</TableCell>
                        <TableCell className="text-sm max-w-[250px] truncate">{email.subject || '-'}</TableCell>
                        <TableCell>{getStatusBadge(email.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(email.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-sm text-red-600 max-w-[200px] truncate">
                          {email.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTracker;
