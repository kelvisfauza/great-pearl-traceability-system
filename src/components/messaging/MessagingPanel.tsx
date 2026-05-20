import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, X, MessageSquarePlus, ArrowLeft, Paperclip, Check, CheckCheck, Reply, Phone, Video, Mic, Lock, Trash2, ChevronUp, Users, UsersRound, PhoneCall } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { usePresenceList } from '@/hooks/usePresenceList';
import { useCall } from '@/contexts/CallContext';
import { useGroupCall } from '@/contexts/GroupCallContext';
import UserSelectorDialog from './UserSelectorDialog';
import NewGroupChatDialog from './NewGroupChatDialog';
import NewGroupCallDialog from '@/components/calls/NewGroupCallDialog';
import GroupSettingsDialog from './GroupSettingsDialog';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import CallRecordingBubble from './CallRecordingBubble';

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messagesData: ReturnType<typeof useMessages>;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  conversation_id: string;
  created_at: string;
  type: 'text' | 'image' | 'file' | 'call_recording';
  metadata?: any;
  read_at?: string;
  reply_to_id?: string;
  replied_message?: Message;
}

const MessagingPanel = ({ isOpen, onClose, messagesData }: MessagingPanelProps) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupCall, setShowGroupCall] = useState<null | { preset: { userId: string; name: string }[]; title?: string; conversationId?: string | null }>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const { employee } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { users: presenceUsers } = usePresenceList();
  const { startCall } = useCall();
  const { startGroupCall } = useGroupCall();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordTimerRef = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const cancelOnReleaseRef = useRef(false);
  const lockedRef = useRef(false);
  const LOCK_THRESHOLD = 70; // px upward to lock
  const CANCEL_THRESHOLD = 100; // px left to cancel

  const startRecording = async () => {
    if (!selectedConversation) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type });
        const ext = type.includes('mp4') ? 'm4a' : 'webm';
        const duration = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000));
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
        try {
          await sendFile({
            file,
            conversationId: selectedConversation,
            senderName: employee?.name,
          });
        } catch (err) {
          console.error('Failed to send voice message:', err);
        }
      };
      mediaRecorderRef.current = recorder;
      recordStartRef.current = Date.now();
      setRecordSeconds(0);
      recorder.start();
      setIsRecording(true);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds(Math.round((Date.now() - recordStartRef.current) / 1000));
      }, 250);
    } catch (err) {
      console.error('Mic permission denied or unavailable:', err);
    }
  };

  const stopRecording = (cancel = false) => {
    const r = mediaRecorderRef.current;
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
    setIsLocked(false);
    lockedRef.current = false;
    setDragOffset({ x: 0, y: 0 });
    pointerStartRef.current = null;
    if (!r) return;
    if (cancel) {
      audioChunksRef.current = [];
      try { r.stream.getTracks().forEach(t => t.stop()); } catch {}
      r.ondataavailable = null as any;
      r.onstop = null as any;
      try { r.stop(); } catch {}
    } else {
      try { r.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
  };

  // WhatsApp-style hold-to-record handlers
  const handleMicPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    cancelOnReleaseRef.current = false;
    setDragOffset({ x: 0, y: 0 });
    startRecording();
  };

  const handleMicPointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current || lockedRef.current) return;
    const dx = Math.min(0, e.clientX - pointerStartRef.current.x); // only leftward
    const dy = Math.min(0, e.clientY - pointerStartRef.current.y); // only upward
    setDragOffset({ x: dx, y: dy });

    // Lock if dragged up past threshold
    if (-dy >= LOCK_THRESHOLD) {
      lockedRef.current = true;
      setIsLocked(true);
      setDragOffset({ x: 0, y: 0 });
      pointerStartRef.current = null;
      return;
    }
    // Mark cancel if dragged left past threshold
    cancelOnReleaseRef.current = -dx >= CANCEL_THRESHOLD;
  };

  const handleMicPointerUp = () => {
    if (lockedRef.current) return; // locked mode — wait for explicit send/cancel
    if (!isRecording && mediaRecorderRef.current == null) {
      // Recording never actually started (e.g. permission denied)
      pointerStartRef.current = null;
      setDragOffset({ x: 0, y: 0 });
      return;
    }
    stopRecording(cancelOnReleaseRef.current);
  };

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      const r = mediaRecorderRef.current;
      if (r) {
        try { r.stream.getTracks().forEach(t => t.stop()); } catch {}
        try { r.stop(); } catch {}
      }
    };
  }, []);
  
  const {
    conversations,
    messages,
    loading,
    sendMessage,
    sendFile,
    fetchMessages,
    createConversation,
    createGroupConversation,
  } = messagesData;

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      // Auto-focus the input so the user can start typing right away
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selectedConversation, fetchMessages]);

  // Fallback polling for the currently open conversation so messages
  // appear in near real-time even if the realtime channel is degraded.
  useEffect(() => {
    if (!selectedConversation) return;
    const i = setInterval(() => {
      fetchMessages(selectedConversation);
    }, 2000);
    return () => clearInterval(i);
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const content = newMessage;
    const reply = replyingTo;
    // Clear the input immediately for a snappy UX; restore on failure.
    setNewMessage('');
    setReplyingTo(null);
    // Keep focus on the input so the user can keep typing
    inputRef.current?.focus();

    try {
      await sendMessage({
        content,
        conversationId: selectedConversation,
        replyToId: reply?.id,
        senderName: employee?.name
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(content);
      setReplyingTo(reply);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleSelectUser = async (userId: string, user?: { name: string; email: string; avatar_url?: string }) => {
    try {
      // Optimistically open existing conversation if it's already in the local list
      const existing = conversations.find((c: any) =>
        c.type !== 'group' &&
        c.participants?.some((p: any) => p.user_id === userId) &&
        c.participants?.some((p: any) => p.user_id === employee?.authUserId)
      );
      if (existing) {
        setSelectedConversation(existing.id);
        return;
      }

      const result = await createConversation({
        participantId: userId,
        otherUser: user
          ? { name: user.name, email: user.email, avatar_url: user.avatar_url }
          : undefined,
      } as any);
      setSelectedConversation(result.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const getConversationName = (conversation: any) => {
    if (conversation.name) return conversation.name;
    
    const otherParticipant = conversation.participants?.find(
      (p: any) => p.user_id !== employee?.authUserId
    );
    return otherParticipant?.employee_name || 'Unknown';
  };

  const getConversationAvatar = (conversation: any) => {
    if (conversation?.type === 'group') {
      return conversation?.avatar_url || undefined;
    }
    const otherParticipant = conversation.participants?.find(
      (p: any) => p.user_id !== employee?.authUserId
    );
    return otherParticipant?.avatar_url;
  };

  const getOtherParticipantPresence = (conversation: any) => {
    const otherParticipant = conversation?.participants?.find(
      (p: any) => p.user_id !== employee?.authUserId
    );
    if (!otherParticipant) return { status: 'offline' as const, lastSeen: null as string | null };
    const presenceUser = presenceUsers.find(u =>
      u.id === otherParticipant.user_id ||
      u.email?.toLowerCase() === otherParticipant.employee_email?.toLowerCase()
    );
    return {
      status: (presenceUser?.status || 'offline') as 'online' | 'away' | 'offline',
      lastSeen: presenceUser?.online_at || presenceUser?.last_login || null,
    };
  };

  const formatLastSeen = (iso: string | null) => {
    if (!iso) return 'last seen a while ago';
    const d = new Date(iso);
    if (isToday(d)) return `last seen today at ${format(d, 'HH:mm')}`;
    if (isYesterday(d)) return `last seen yesterday at ${format(d, 'HH:mm')}`;
    return `last seen ${formatDistanceToNow(d, { addSuffix: true })}`;
  };

  const handleFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedConversation) return;
    
    const file = e.target.files[0];
    try {
      await sendFile({ 
        file, 
        conversationId: selectedConversation,
        senderName: employee?.name
      });
      e.target.value = '';
    } catch (error) {
      console.error('Failed to send file:', error);
    }
  };

  const getCurrentConversation = () => {
    return conversations.find(c => c.id === selectedConversation);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const currentConversation = getCurrentConversation();
  
  // Sort conversations by most recent message (most recent on top)
  const sortedConversations = [...conversations].sort((a, b) => {
    const aTime = a.lastMessage 
      ? new Date(a.lastMessage.created_at).getTime()
      : new Date(a.created_at).getTime();
    const bTime = b.lastMessage
      ? new Date(b.lastMessage.created_at).getTime()
      : new Date(b.created_at).getTime();
    return bTime - aTime;
  });

  return (
    <>
      <div className="fixed inset-0 sm:inset-auto sm:right-4 sm:bottom-20 sm:w-96 sm:h-[600px] sm:rounded-lg bg-background border border-border shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* WhatsApp-style Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedConversation ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary-foreground/10"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    if ((currentConversation as any)?.type === 'group') setShowGroupSettings(true);
                  }}
                  className={`flex items-center gap-3 flex-1 min-w-0 text-left ${(currentConversation as any)?.type === 'group' ? 'hover:opacity-90' : ''}`}
                >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={getConversationAvatar(currentConversation)} alt={getConversationName(currentConversation)} />
                  <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-sm">
                    {getConversationName(currentConversation)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {getConversationName(currentConversation)}
                  </p>
                  {(() => {
                    const { status, lastSeen } = getOtherParticipantPresence(currentConversation);
                    const label =
                      status === 'online' ? 'online'
                      : status === 'away' ? (lastSeen ? `away — ${formatLastSeen(lastSeen)}` : 'away')
                      : formatLastSeen(lastSeen);
                    return (
                      <p className="text-xs opacity-80 flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            status === 'online' ? 'bg-green-400'
                            : status === 'away' ? 'bg-yellow-400'
                            : 'bg-muted-foreground/60'
                          }`}
                        />
                        <span className="overflow-hidden whitespace-nowrap flex-1 min-w-0">
                          <span className="marquee-track">
                            <span className="px-4">{label}</span>
                            <span className="px-4">{label}</span>
                          </span>
                        </span>
                      </p>
                    );
                  })()}
                </div>
                </button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary-foreground/10"
                    aria-label="Voice call"
                    onClick={() => {
                      const isGroup = (currentConversation as any)?.type === 'group';
                      if (isGroup) {
                        const preset = (currentConversation?.participants || [])
                          .filter((p: any) => p.user_id !== employee?.authUserId && p.user_id)
                          .map((p: any) => ({ userId: p.user_id, name: p.employee_name || 'User' }));
                        if (preset.length === 0) return;
                        startGroupCall({
                          type: 'audio',
                          invitees: preset,
                          title: getConversationName(currentConversation),
                          conversationId: currentConversation?.id || null,
                        });
                        return;
                      }
                      const other = currentConversation?.participants?.find(
                        (p: any) => p.user_id !== employee?.authUserId
                      );
                      if (other?.user_id) startCall(other.user_id, other.employee_name || 'User', 'audio');
                    }}
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary-foreground/10"
                    aria-label="Video call"
                    onClick={() => {
                      const isGroup = (currentConversation as any)?.type === 'group';
                      if (isGroup) {
                        const preset = (currentConversation?.participants || [])
                          .filter((p: any) => p.user_id !== employee?.authUserId && p.user_id)
                          .map((p: any) => ({ userId: p.user_id, name: p.employee_name || 'User' }));
                        if (preset.length === 0) return;
                        startGroupCall({
                          type: 'video',
                          invitees: preset,
                          title: getConversationName(currentConversation),
                          conversationId: currentConversation?.id || null,
                        });
                        return;
                      }
                      const other = currentConversation?.participants?.find(
                        (p: any) => p.user_id !== employee?.authUserId
                      );
                      if (other?.user_id) startCall(other.user_id, other.employee_name || 'User', 'video');
                    }}
                  >
                    <Video className="h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold">Messages</h3>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary-foreground/10"
                    aria-label="New group call"
                    title="New group call"
                    onClick={() => setShowGroupCall({ preset: [] })}
                  >
                    <PhoneCall className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary-foreground/10"
                    aria-label="New group chat"
                    title="New group chat"
                    onClick={() => setShowNewGroup(true)}
                  >
                    <UsersRound className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary-foreground/10"
                    onClick={() => setShowUserSelector(true)}
                  >
                    <MessageSquarePlus className="h-5 w-5" />
                  </Button>
                </div>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary-foreground/10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {selectedConversation ? (
          <>
            {/* WhatsApp-style Messages Area */}
            <ScrollArea className="flex-1 px-4 py-2 bg-muted/20">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquarePlus className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                  <div className="space-y-2 py-2">
                  {messages.map((message, index) => {
                    const isOwnMessage = message.sender_id === employee?.authUserId;
                    const showDate = index === 0 || 
                      format(new Date(message.created_at), 'yyyy-MM-dd') !== 
                      format(new Date(messages[index - 1].created_at), 'yyyy-MM-dd');
                    
                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="flex justify-center my-3">
                            <div className="flex items-center gap-3 w-full">
                              <div className="flex-1 h-px bg-border"></div>
                              <span className="bg-muted/80 text-xs px-3 py-1 rounded-full text-muted-foreground font-medium">
                                {format(new Date(message.created_at), 'dd/MM/yyyy') === format(new Date(), 'dd/MM/yyyy')
                                  ? 'Today'
                                  : format(new Date(message.created_at), 'MMM dd, yyyy')}
                              </span>
                              <div className="flex-1 h-px bg-border"></div>
                            </div>
                          </div>
                        )}
                        
                        {/* Show sender name for incoming messages */}
                        {!isOwnMessage && message.sender_name && (
                          <div className="text-xs text-muted-foreground ml-2 mb-1">
                            {message.sender_name}
                          </div>
                        )}
                        
                        <div className="group relative">
                          <div
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-lg shadow-sm ${
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground rounded-br-none'
                                  : 'bg-card border border-border rounded-bl-none'
                              } ${message.type === 'image' ? 'p-1' : 'px-3 py-2'}`}
                            >
                              {/* Show replied message if exists */}
                              {message.replied_message && (
                                <div className={`mb-2 pb-2 border-l-2 pl-2 text-xs opacity-70 ${
                                  isOwnMessage ? 'border-primary-foreground/30' : 'border-primary/30'
                                }`}>
                                  <div className="font-semibold">{message.replied_message.sender_name || 'Someone'}</div>
                                  <div className="truncate">
                                    {message.replied_message.type === 'text' 
                                      ? message.replied_message.content 
                                      : `[${message.replied_message.type}]`}
                                  </div>
                                </div>
                              )}
                              
                              {message.type === 'call_recording' ? (
                                <CallRecordingBubble message={message} isOwnMessage={isOwnMessage} />
                              ) : message.type === 'image' ? (
                                <div>
                                  <img 
                                    src={message.content} 
                                    alt="Attachment" 
                                    className="max-w-full rounded-lg max-h-64 object-cover"
                                  />
                                  <div className={`flex items-center justify-end gap-1 mt-1 px-2 pb-1 text-[10px] ${
                                    isOwnMessage ? 'opacity-70' : 'text-muted-foreground'
                                  }`}>
                                    <span>{format(new Date(message.created_at), 'HH:mm')}</span>
                                    {isOwnMessage && (
                                      message.read_at ? (
                                        <CheckCheck className="h-3 w-3 text-blue-400" />
                                      ) : (message as any).delivered_at ? (
                                        <CheckCheck className="h-3 w-3 opacity-70" />
                                      ) : (
                                        <Check className="h-3 w-3 opacity-70" />
                                      )
                                    )}
                                  </div>
                                </div>
                              ) : message.type === 'file' ? (
                                (message.metadata?.mimeType || '').startsWith('audio/') ? (
                                <div className="min-w-[200px]">
                                  <audio controls src={message.content} className="max-w-full h-10" />
                                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                    isOwnMessage ? 'opacity-70' : 'text-muted-foreground'
                                  }`}>
                                    <span>{format(new Date(message.created_at), 'HH:mm')}</span>
                                    {isOwnMessage && (
                                      message.read_at ? (
                                        <CheckCheck className="h-3 w-3 text-blue-400" />
                                      ) : (message as any).delivered_at ? (
                                        <CheckCheck className="h-3 w-3 opacity-70" />
                                      ) : (
                                        <Check className="h-3 w-3 opacity-70" />
                                      )
                                    )}
                                  </div>
                                </div>
                                ) : (
                                <div>
                                  <a 
                                    href={message.content} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 hover:underline"
                                  >
                                    <Paperclip className="h-4 w-4" />
                                    <span className="text-sm">{message.metadata?.fileName || 'File'}</span>
                                  </a>
                                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                    isOwnMessage ? 'opacity-70' : 'text-muted-foreground'
                                  }`}>
                                    <span>{format(new Date(message.created_at), 'HH:mm')}</span>
                                    {isOwnMessage && (
                                      message.read_at ? (
                                        <CheckCheck className="h-3 w-3 text-blue-400" />
                                      ) : (message as any).delivered_at ? (
                                        <CheckCheck className="h-3 w-3 opacity-70" />
                                      ) : (
                                        <Check className="h-3 w-3 opacity-70" />
                                      )
                                    )}
                                  </div>
                                </div>
                                )
                              ) : (
                                <>
                                  <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                    isOwnMessage ? 'opacity-70' : 'text-muted-foreground'
                                  }`}>
                                    <span>{format(new Date(message.created_at), 'HH:mm')}</span>
                                    {isOwnMessage && (
                                      message.read_at ? (
                                        <CheckCheck className="h-3 w-3 text-blue-400" />
                                      ) : (message as any).delivered_at ? (
                                        <CheckCheck className="h-3 w-3 opacity-70" />
                                      ) : (
                                        <Check className="h-3 w-3 opacity-70" />
                                      )
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Reply button - shown on hover */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`absolute top-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                              isOwnMessage ? 'left-0' : 'right-0'
                            }`}
                            onClick={() => handleReply(message)}
                          >
                            <Reply className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* WhatsApp-style Message Input */}
            <div className="p-3 bg-muted/30 border-t">
              {/* Reply preview */}
              {replyingTo && (
                <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-primary">
                      Replying to {replyingTo.sender_name || 'Someone'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {replyingTo.type === 'text' 
                        ? replyingTo.content 
                        : `[${replyingTo.type}]`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={cancelReply}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {isRecording ? (
                isLocked ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 hover:bg-muted text-destructive"
                      onClick={() => stopRecording(true)}
                      aria-label="Cancel recording"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-full bg-background border">
                      <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                      <span className="text-sm font-medium tabular-nums">
                        {Math.floor(recordSeconds / 60).toString().padStart(2, '0')}:
                        {(recordSeconds % 60).toString().padStart(2, '0')}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    </div>
                    <Button
                      onClick={() => stopRecording(false)}
                      size="icon"
                      className="rounded-full h-10 w-10"
                      aria-label="Send voice message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-2">
                    {/* Slide-up lock hint above the mic */}
                    <div
                      className="absolute right-1 -top-24 flex flex-col items-center gap-1 pointer-events-none select-none"
                      style={{
                        opacity: Math.min(1, Math.max(0.4, -dragOffset.y / LOCK_THRESHOLD + 0.4)),
                        transform: `translateY(${Math.max(dragOffset.y, -LOCK_THRESHOLD)}px)`,
                      }}
                    >
                      <div className="h-10 w-10 rounded-full bg-muted border flex items-center justify-center shadow-sm">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <ChevronUp className="h-4 w-4 text-muted-foreground animate-bounce" />
                    </div>

                    {/* Recording status pill with slide-to-cancel */}
                    <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-full bg-background border overflow-hidden">
                      <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                      <span className="text-sm font-medium tabular-nums flex-shrink-0">
                        {Math.floor(recordSeconds / 60).toString().padStart(2, '0')}:
                        {(recordSeconds % 60).toString().padStart(2, '0')}
                      </span>
                      <div
                        className="ml-auto text-xs text-muted-foreground flex items-center gap-1 truncate"
                        style={{
                          transform: `translateX(${Math.max(dragOffset.x, -CANCEL_THRESHOLD)}px)`,
                          opacity: Math.max(0.3, 1 + dragOffset.x / CANCEL_THRESHOLD),
                        }}
                      >
                        <ChevronUp className="h-3 w-3 -rotate-90" />
                        <span className={cancelOnReleaseRef.current ? 'text-destructive font-medium' : ''}>
                          {cancelOnReleaseRef.current ? 'Release to cancel' : 'Slide to cancel'}
                        </span>
                      </div>
                    </div>

                    {/* Mic button — held */}
                    <button
                      type="button"
                      onPointerMove={handleMicPointerMove}
                      onPointerUp={handleMicPointerUp}
                      onPointerCancel={handleMicPointerUp}
                      className="rounded-full h-12 w-12 bg-primary text-primary-foreground flex items-center justify-center shadow-lg scale-110 transition-transform touch-none select-none"
                      aria-label="Recording"
                      style={{
                        transform: `translate(${Math.max(dragOffset.x, -CANCEL_THRESHOLD)}px, ${Math.max(dragOffset.y, -LOCK_THRESHOLD)}px) scale(1.1)`,
                      }}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  </div>
                )
              ) : (
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileAttachment}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message"
                  className="flex-1 rounded-full bg-background"
                />
                {newMessage.trim() ? (
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    className="rounded-full h-10 w-10"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                ) : (
                  <button
                    type="button"
                    onPointerDown={handleMicPointerDown}
                    className="rounded-full h-10 w-10 bg-primary text-primary-foreground flex items-center justify-center touch-none select-none"
                    aria-label="Hold to record voice message"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                )}
              </div>
              )}
            </div>
          </>
        ) : (
          <ScrollArea className="flex-1 bg-background">
            {sortedConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquarePlus className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No conversations yet</p>
                <p className="text-sm text-muted-foreground mb-6">Start chatting with your colleagues</p>
                <Button onClick={() => setShowUserSelector(true)} className="rounded-full">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            ) : (
              <div>
                {sortedConversations.map((conversation) => {
                  const lastMessage = conversation.lastMessage;
                  const unreadCount = conversation.unread_count || 0;
                  const conversationName = getConversationName(conversation);
          const { status: presenceStatus } = getOtherParticipantPresence(conversation);
          const isGroup = (conversation as any)?.type === 'group';
          const isUnread = unreadCount > 0;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className="w-full p-3 hover:bg-muted/50 transition-colors text-left flex items-center gap-3 border-b border-border/50"
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getConversationAvatar(conversation)} alt={conversationName} />
                          <AvatarFallback className={`font-semibold ${isGroup ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'}`}>
                            {isGroup ? <UsersRound className="h-6 w-6" /> : conversationName?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isGroup ? (
                          <span
                            aria-label="Group chat"
                            className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ring-2 ring-background bg-primary text-primary-foreground flex items-center justify-center"
                          >
                            <Users className="h-2.5 w-2.5" />
                          </span>
                        ) : (
                          <span
                            aria-label={presenceStatus}
                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-background ${
                              presenceStatus === 'online' ? 'bg-green-500'
                              : presenceStatus === 'away' ? 'bg-yellow-400'
                              : 'bg-muted-foreground/50'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`text-sm truncate flex items-center gap-1.5 ${isUnread ? 'font-bold text-foreground' : 'font-semibold'}`}>
                            {isGroup && <UsersRound className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                            <span className="truncate">{conversationName}</span>
                          </p>
                          {lastMessage && (
                            <span className={`text-xs flex-shrink-0 ml-2 ${isUnread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                              {format(new Date(lastMessage.created_at), 'HH:mm')}
                            </span>
                          )}
                        </div>
                         <div className="flex items-center justify-between gap-2">
                           <p className={`text-sm truncate flex-1 ${isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                             {(() => {
                               if (!lastMessage) return 'Tap to start chatting';
                               const mime = lastMessage.metadata?.mimeType || '';
                               if (mime.startsWith('audio/')) return '🎤 Voice message';
                               if (mime.startsWith('image/') || lastMessage.type === 'image') return '📷 Photo';
                               if (lastMessage.type === 'call_recording') return '🎙️ Call recording';
                               if (lastMessage.type === 'file') return `📎 ${lastMessage.metadata?.fileName || 'File'}`;
                               return lastMessage.content;
                             })()}
                           </p>
                          {unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-medium flex-shrink-0">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        )}
      </div>

      <UserSelectorDialog 
        open={showUserSelector}
        onClose={() => setShowUserSelector(false)}
        onSelectUser={handleSelectUser}
      />

      {currentConversation && (currentConversation as any).type === 'group' && (
        <GroupSettingsDialog
          open={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
          conversationId={currentConversation.id}
          initialName={getConversationName(currentConversation)}
          initialAvatarUrl={(currentConversation as any).avatar_url}
          onSaved={() => { try { (messagesData as any).fetchConversations?.(); } catch {} }}
        />
      )}

      <NewGroupChatDialog
        open={showNewGroup}
        onClose={() => setShowNewGroup(false)}
        onCreate={async ({ name, participantIds }) => {
          const result = await createGroupConversation({ name, participantIds });
          if (result?.id) setSelectedConversation(result.id);
          return result;
        }}
      />

      <NewGroupCallDialog
        open={!!showGroupCall}
        onClose={() => setShowGroupCall(null)}
        presetInvitees={showGroupCall?.preset}
        title={showGroupCall?.title}
        conversationId={showGroupCall?.conversationId}
      />
    </>
  );
};

export default MessagingPanel;
