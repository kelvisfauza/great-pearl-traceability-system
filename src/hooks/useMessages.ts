import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, getDocs, Timestamp, or } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  conversationId: string;
  createdAt: string;
  type: 'text' | 'image' | 'file';
  readBy?: string[];
}

interface Conversation {
  id: string;
  name?: string;
  type: 'direct' | 'group';
  participants: string[];
  participantNames: string[];
  participantEmployeeIds: string[];
  createdAt: string;
  lastMessage?: Message;
  lastMessageAt?: string;
  createdBy: string;
}

interface Employee {
  id: string;
  name: string;
  employee_id?: string;
  department: string;
  position: string;
}

export const useMessages = (currentUserId?: string, currentEmployeeId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  // Fetch all employees for user selection
  const fetchEmployees = useCallback(async () => {
    try {
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const employeesData = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      
      // Filter out current user
      const filteredEmployees = employeesData.filter(emp => emp.id !== currentEmployeeId);
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, [currentEmployeeId]);

  // Fetch conversations for current user
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUserId),
        orderBy('lastMessageAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const conversationsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            lastMessageAt: data.lastMessageAt?.toDate?.()?.toISOString() || data.lastMessageAt,
          };
        }) as Conversation[];
        
        setConversations(conversationsData);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch conversations",
        variant: "destructive"
      });
      setLoading(false);
      return undefined;
    }
  }, [currentUserId, toast]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;

    try {
      setLoadingMessages(true);
      
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messagesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          };
        }) as Message[];
        
        setMessages(messagesData);
        setLoadingMessages(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive"
      });
      setLoadingMessages(false);
    }
  }, [toast]);

  // Send a message
  const sendMessage = async ({ content, conversationId, recipientUserId, recipientEmployeeId, recipientName }: {
    content: string;
    conversationId?: string | null;
    recipientUserId?: string;
    recipientEmployeeId?: string;
    recipientName?: string;
  }) => {
    if (!currentUserId || !currentEmployeeId) {
      throw new Error('User not authenticated');
    }

    try {
      let finalConversationId = conversationId;

      // If no conversation exists, create one
      if (!finalConversationId && recipientUserId && recipientEmployeeId && recipientName) {
        const newConversation = await createConversation({
          type: 'direct',
          recipientUserId,
          recipientEmployeeId,
          recipientName
        });
        finalConversationId = newConversation.id;
      }

      if (!finalConversationId) {
        throw new Error('No conversation ID available');
      }

      // Get current employee data
      const currentEmployee = employees.find(emp => emp.id === currentEmployeeId) || 
                             { name: 'Unknown User', id: currentEmployeeId };

      const messageData = {
        content,
        conversationId: finalConversationId,
        senderId: currentUserId,
        senderName: currentEmployee.name,
        type: 'text' as const,
        createdAt: Timestamp.now(),
        readBy: [currentUserId] // Mark as read by sender
      };

      const messageRef = await addDoc(collection(db, 'messages'), messageData);

      // Update conversation's last message
      await updateDoc(doc(db, 'conversations', finalConversationId), {
        lastMessageAt: Timestamp.now(),
        lastMessage: {
          id: messageRef.id,
          content,
          senderId: currentUserId,
          senderName: currentEmployee.name,
          createdAt: messageData.createdAt.toDate().toISOString()
        }
      });

      return messageRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Create a new conversation
  const createConversation = async ({ type, recipientUserId, recipientEmployeeId, recipientName }: {
    type: 'direct' | 'group';
    recipientUserId: string;
    recipientEmployeeId: string;
    recipientName: string;
  }) => {
    if (!currentUserId || !currentEmployeeId) {
      throw new Error('User not authenticated');
    }

    try {
      // Check if conversation already exists between these two users
      const existingConversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUserId)
      );
      
      const existingSnapshot = await getDocs(existingConversationsQuery);
      const existingConversation = existingSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(recipientUserId) && data.participants.length === 2;
      });

      if (existingConversation) {
        return { id: existingConversation.id, name: recipientName };
      }

      // Get current employee data
      const currentEmployee = employees.find(emp => emp.id === currentEmployeeId) || 
                             { name: 'Unknown User', employee_id: currentEmployeeId };

      const conversationData = {
        type,
        participants: [currentUserId, recipientUserId],
        participantNames: [currentEmployee.name, recipientName],
        participantEmployeeIds: [currentEmployeeId, recipientEmployeeId],
        createdAt: Timestamp.now(),
        createdBy: currentUserId,
        lastMessageAt: Timestamp.now()
      };

      const conversationRef = await addDoc(collection(db, 'conversations'), conversationData);
      
      return { id: conversationRef.id, name: recipientName };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  // Mark conversation as read
  const markAsRead = async (conversationId: string) => {
    if (!currentUserId) return;

    try {
      // Mark all messages in conversation as read by current user
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('senderId', '!=', currentUserId)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      
      const updatePromises = messagesSnapshot.docs.map(doc => {
        const data = doc.data();
        const readBy = data.readBy || [];
        if (!readBy.includes(currentUserId)) {
          return updateDoc(doc.ref, {
            readBy: [...readBy, currentUserId]
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      // In a real implementation, you might want to soft delete or remove user from participants
      console.log('Would delete conversation:', conversationId);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  };

  // Calculate unread count
  useEffect(() => {
    let unread = 0;
    conversations.forEach(conversation => {
      if (conversation.lastMessage?.senderId !== currentUserId) {
        // Check if user has read the last message
        const lastMessage = conversation.lastMessage;
        if (lastMessage && (!lastMessage.readBy || !lastMessage.readBy.includes(currentUserId!))) {
          unread++;
        }
      }
    });
    setUnreadCount(unread);
  }, [conversations, currentUserId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (!currentUserId) return;

    let unsubscribeFunction: (() => void) | undefined;

    const setupSubscription = async () => {
      const unsubscribe = await fetchConversations();
      unsubscribeFunction = unsubscribe;
    };

    setupSubscription();

    return () => {
      if (unsubscribeFunction) {
        unsubscribeFunction();
      }
    };
  }, [currentUserId, fetchConversations]);

  return {
    conversations,
    messages,
    employees,
    loading,
    loadingMessages,
    unreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    markAsRead,
    deleteConversation
  };
};
