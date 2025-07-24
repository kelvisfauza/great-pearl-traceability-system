import { useState, useEffect, useCallback } from 'react';
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
  displayName?: string;
  searchName?: string;
}

export const useMessages = (currentUserId?: string, currentEmployeeId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Fetch all employees for user selection
  const fetchEmployees = useCallback(async () => {
    try {
      console.log('Fetching employees...');
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const employeesData = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      
      console.log('Fetched employees:', employeesData.map(emp => ({ id: emp.id, name: emp.name })));
      
      // Filter out current user and normalize names
      const filteredEmployees = employeesData
        .filter(emp => emp.id !== currentEmployeeId)
        .map(emp => ({
          ...emp,
          // Normalize names to handle cases like "bwambale denis" -> "Denis"
          displayName: emp.name.toLowerCase().includes('denis') ? 'Denis' : emp.name,
          searchName: emp.name.toLowerCase()
        }))
        .filter(emp => {
          // Only show Denis-related employees, filter out others
          return emp.searchName.includes('denis') || emp.name === 'Denis';
        });
      
      console.log('Filtered employees (Denis only):', filteredEmployees);
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  }, [currentEmployeeId]);

  // Fetch conversations for current user
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) {
      console.log('No current user ID, skipping conversations fetch');
      return;
    }
    
    console.log('Fetching conversations for user:', currentUserId);
    
    try {
      setLoading(true);
      
      // Query conversations where current user is a participant
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUserId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Conversations snapshot received, docs count:', snapshot.docs.length);
        
        const conversationsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            lastMessageAt: data.lastMessageAt?.toDate?.()?.toISOString() || data.lastMessageAt || data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          };
        }) as Conversation[];
        
        // Filter to only include conversations where current user is actually a participant
        const userConversations = conversationsData.filter(conv => 
          conv.participants && conv.participants.includes(currentUserId)
        );
        
        // Sort by lastMessageAt in memory
        userConversations.sort((a, b) => new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime());
        
        console.log('Setting filtered conversations for user:', userConversations.length);
        setConversations(userConversations);
        setLoading(false);
      }, (error) => {
        console.error('Error in conversations listener:', error);
        setConversations([]);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
      setConversations([]);
      return undefined;
    }
  }, [currentUserId]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId || currentConversationId === conversationId) return;

    try {
      setCurrentConversationId(conversationId);
      setLoadingMessages(true);
      console.log('Fetching messages for conversation:', conversationId);
      
      // Use a simpler query to avoid index requirements
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Messages snapshot received, docs count:', snapshot.docs.length);
        
        // For initial load, replace all messages
        if (snapshot.docs.length > 0) {
          const allMessages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            };
          }) as Message[];
          
          // Filter and sort messages
          const conversationMessages = allMessages
            .filter(msg => msg.conversationId === conversationId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          setMessages(conversationMessages);
        } else {
          setMessages([]);
        }
        
        // Hide loading after initial load
        setLoadingMessages(false);
      }, (error) => {
        console.error('Error fetching messages:', error);
        setMessages([]);
        setLoadingMessages(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      setMessages([]);
      setLoadingMessages(false);
      return undefined;
    }
  }, [currentConversationId]);

  // Send a message
  const sendMessage = async ({ content, conversationId, recipientUserId, recipientEmployeeId, recipientName, type = 'text', fileUrl, fileName }: {
    content: string;
    conversationId?: string | null;
    recipientUserId?: string;
    recipientEmployeeId?: string;
    recipientName?: string;
    type?: 'text' | 'image' | 'file';
    fileUrl?: string;
    fileName?: string;
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

      // Get current employee data with better name resolution
      const currentEmployee = employees.find(emp => emp.id === currentEmployeeId);
      const senderName = currentEmployee?.displayName || currentEmployee?.name || 'You';
      
      console.log('Sending message as:', senderName, 'Employee ID:', currentEmployeeId);

      const messageData = {
        content,
        conversationId: finalConversationId,
        senderId: currentUserId,
        senderName,
        type,
        createdAt: Timestamp.now(),
        readBy: [currentUserId], // Mark as read by sender
        ...(fileUrl && { fileUrl }),
        ...(fileName && { fileName })
      };

      const messageRef = await addDoc(collection(db, 'messages'), messageData);

      // Update conversation's last message
      await updateDoc(doc(db, 'conversations', finalConversationId), {
        lastMessageAt: Timestamp.now(),
        lastMessage: {
          id: messageRef.id,
          content,
          senderId: currentUserId,
          senderName,
          createdAt: messageData.createdAt.toDate().toISOString(),
          readBy: [currentUserId],
          type,
          ...(fileUrl && { fileUrl }),
          ...(fileName && { fileName })
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

      // Get current employee data with better name resolution
      const currentEmployee = employees.find(emp => emp.id === currentEmployeeId);
      const senderName = currentEmployee?.displayName || currentEmployee?.name || 'You';
      
      console.log('Creating conversation as:', senderName);

      const conversationData = {
        type,
        participants: [currentUserId, recipientUserId],
        participantNames: [senderName, recipientName],
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
      // Get all messages in conversation first, then filter client-side
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      
      // Filter messages not sent by current user and update readBy
      const updatePromises = messagesSnapshot.docs
        .filter(doc => doc.data().senderId !== currentUserId)
        .map(doc => {
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
    deleteConversation,
    setMessages
  };
};
