import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  where,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ITTicket {
  id: string;
  ticket_id: string;
  title: string;
  description: string;
  submitted_by: string;
  submitted_by_id?: string;
  department: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assigned_to?: string;
  assigned_to_id?: string;
  resolution?: string;
  comments: TicketComment[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  category?: string;
  tags?: string[];
}

export interface TicketComment {
  id: string;
  author: string;
  author_id: string;
  content: string;
  timestamp: string;
  is_internal?: boolean;
}

export const useFirebaseTickets = () => {
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { hasPermission, employee } = useAuth();

  // Generate ticket ID
  const generateTicketId = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `IT-${timestamp}`;
  };

  // Fetch tickets with real-time updates
  const fetchTickets = () => {
    if (!hasPermission('IT Management')) return;

    try {
      const ticketsQuery = query(
        collection(db, 'it_tickets'), 
        orderBy('created_at', 'desc')
      );
      
      const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
        const ticketsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ITTicket[];
        
        setTickets(ticketsData);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up tickets listener:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Create new ticket
  const createTicket = async (ticketData: Omit<ITTicket, 'id' | 'ticket_id' | 'created_at' | 'updated_at' | 'comments'>) => {
    if (!hasPermission('IT Management')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create tickets",
        variant: "destructive"
      });
      return;
    }

    try {
      const newTicket = {
        ...ticketData,
        ticket_id: generateTicketId(),
        comments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        submitted_by: employee?.name || 'Unknown User',
        submitted_by_id: employee?.id
      };

      const docRef = await addDoc(collection(db, 'it_tickets'), newTicket);
      
      toast({
        title: "Success",
        description: `Ticket ${newTicket.ticket_id} created successfully`
      });

      return { id: docRef.id, ...newTicket };
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Update ticket
  const updateTicket = async (ticketId: string, updates: Partial<ITTicket>) => {
    if (!hasPermission('IT Management')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to update tickets",
        variant: "destructive"
      });
      return;
    }

    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        ...(updates.status === 'resolved' && { resolved_at: new Date().toISOString() })
      };

      await updateDoc(doc(db, 'it_tickets', ticketId), updateData);
      
      toast({
        title: "Success",
        description: "Ticket updated successfully"
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Add comment to ticket
  const addComment = async (ticketId: string, content: string, isInternal = false) => {
    if (!hasPermission('IT Management')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to add comments",
        variant: "destructive"
      });
      return;
    }

    try {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      const newComment: TicketComment = {
        id: `comment-${Date.now()}`,
        author: employee?.name || 'Unknown User',
        author_id: employee?.id || '',
        content,
        timestamp: new Date().toISOString(),
        is_internal: isInternal
      };

      const updatedComments = [...ticket.comments, newComment];

      await updateDoc(doc(db, 'it_tickets', ticketId), {
        comments: updatedComments,
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Delete ticket
  const deleteTicket = async (ticketId: string) => {
    if (!hasPermission('IT Management')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete tickets",
        variant: "destructive"
      });
      return;
    }

    try {
      await deleteDoc(doc(db, 'it_tickets', ticketId));
      
      toast({
        title: "Success",
        description: "Ticket deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Get tickets by status
  const getTicketsByStatus = (status: string) => {
    return tickets.filter(ticket => ticket.status === status);
  };

  // Get tickets by priority
  const getTicketsByPriority = (priority: string) => {
    return tickets.filter(ticket => ticket.priority === priority);
  };

  useEffect(() => {
    const unsubscribe = fetchTickets();
    return unsubscribe;
  }, []);

  return {
    tickets,
    loading,
    createTicket,
    updateTicket,
    deleteTicket,
    addComment,
    getTicketsByStatus,
    getTicketsByPriority,
    refetch: fetchTickets
  };
};