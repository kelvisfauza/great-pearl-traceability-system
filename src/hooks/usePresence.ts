
import { useEffect, useCallback, useState } from 'react';
import { doc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const usePresence = (userId?: string) => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline' = 'online') => {
    if (!userId) return;

    try {
      await setDoc(doc(db, 'user_presence', userId), {
        status,
        lastSeen: new Date().toISOString(),
        userId
      }, { merge: true });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [userId]);

  const setOffline = useCallback(async () => {
    await updatePresence('offline');
  }, [updatePresence]);

  useEffect(() => {
    if (!userId) return;

    // Set user as online when hook mounts
    updatePresence('online');

    // Listen to all online users
    const presenceQuery = query(
      collection(db, 'user_presence'),
      where('status', '==', 'online')
    );

    const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
      const onlineUserIds = snapshot.docs.map(doc => doc.data().userId);
      setOnlineUsers(onlineUserIds);
    });

    // Set up event listeners for when user becomes inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribe();
      setOffline();
    };
  }, [userId, updatePresence, setOffline]);

  return { updatePresence, onlineUsers };
};
