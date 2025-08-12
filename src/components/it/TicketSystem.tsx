import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bug, 
  Plus, 
  Search, 
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Calendar,
  Loader2
} from 'lucide-react';
import { useFirebaseTickets } from '@/hooks/useFirebaseTickets';

const TicketSystem = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { tickets, loading, updateTicket } = useFirebaseTickets();

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-100 text-blue-800">Open</Badge>;
      case 'in-progress':
        return <Badge className="bg-orange-100 text-orange-800">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
      case 'closed':
        return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in-progress':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bug className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => 
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.submitted_by.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTicketsByStatus = (status: string) => {
    return filteredTickets.filter(ticket => ticket.status === status);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tickets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ticket Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bug className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold">{tickets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
                <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'open').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'in-progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'resolved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Support Tickets
              </CardTitle>
              <CardDescription>Manage IT support requests and issues</CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Tickets by Status */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-4">
                {filteredTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </TabsContent>

              <TabsContent value="open" className="space-y-3 mt-4">
                {getTicketsByStatus('open').map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </TabsContent>

              <TabsContent value="in-progress" className="space-y-3 mt-4">
                {getTicketsByStatus('in-progress').map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </TabsContent>

              <TabsContent value="resolved" className="space-y-3 mt-4">
                {getTicketsByStatus('resolved').map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </TabsContent>

              <TabsContent value="closed" className="space-y-3 mt-4">
                {getTicketsByStatus('closed').map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function TicketCard({ ticket }: { ticket: any }) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getStatusIcon(ticket.status)}
            <div>
              <h4 className="font-medium">{ticket.title}</h4>
              <p className="text-sm text-gray-500">#{ticket.ticket_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getPriorityBadge(ticket.priority)}
            {getStatusBadge(ticket.status)}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3">{ticket.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm">
            <div>
              <p className="font-medium text-gray-700">Submitted By</p>
              <p className="text-gray-600 flex items-center gap-1">
                <User className="h-3 w-3" />
                {ticket.submitted_by}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Department</p>
              <p className="text-gray-600">{ticket.department}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Assigned To</p>
              <p className="text-gray-600">{ticket.assigned_to || 'Unassigned'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Created</p>
              <p className="text-gray-600 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(ticket.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm">
              View Details
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const nextStatus = ticket.status === 'open' ? 'in-progress' : 
                                 ticket.status === 'in-progress' ? 'resolved' : 'open';
                updateTicket(ticket.id, { status: nextStatus });
              }}
            >
              {ticket.status === 'open' ? 'Start' : 
               ticket.status === 'in-progress' ? 'Resolve' : 'Reopen'}
            </Button>
            <Button variant="outline" size="sm">
              Add Comment
            </Button>
          </div>
      </div>
    );
  }
};

export default TicketSystem;