import React, { createContext, useContext, useState } from 'react';
import { Announcement } from '../models';
import { AnnouncementService } from '../services/announcementService';

interface NotificationContextValue {
  announcements: Announcement[];
  isLoading: boolean;
  errorMessage: string | null;
  unreadCount: number;
  loadAnnouncements: (userId?: string | null, isAdmin?: boolean) => Promise<void>;
  markAsRead: (announcementId: string, userId?: string | null) => Promise<void>;
  markAllAsRead: (userId?: string | null) => Promise<void>;
  createAnnouncement: (params: {
    title: string;
    message: string;
    isPublished?: boolean;
    createdBy?: string;
  }) => Promise<boolean>;
  updateAnnouncement: (params: {
    id: string;
    title?: string;
    message?: string;
    isPublished?: boolean;
  }) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unreadCount = announcements.filter((a) => !a.isRead && a.isPublished).length;

  const loadAnnouncements = async (userId?: string | null, isAdmin = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await AnnouncementService.fetchAnnouncements(userId, isAdmin);
      setAnnouncements(list);
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (announcementId: string, userId?: string | null) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, isRead: true } : a))
    );
    if (userId) {
      await AnnouncementService.markAsRead(announcementId, userId);
    }
  };

  const markAllAsRead = async (userId?: string | null) => {
    const ids = announcements.map((a) => a.id);
    setAnnouncements((prev) => prev.map((a) => ({ ...a, isRead: true })));
    if (userId) {
      await AnnouncementService.markAllAsRead(ids, userId);
    }
  };

  const createAnnouncement = async (params: {
    title: string;
    message: string;
    isPublished?: boolean;
    createdBy?: string;
  }) => {
    try {
      const created = await AnnouncementService.createAnnouncement(params);
      setAnnouncements((prev) => [created, ...prev]);
      return true;
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
      return false;
    }
  };

  const updateAnnouncement = async (params: {
    id: string;
    title?: string;
    message?: string;
    isPublished?: boolean;
  }) => {
    try {
      await AnnouncementService.updateAnnouncement(params);
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === params.id
            ? {
                ...a,
                ...(params.title !== undefined ? { title: params.title } : {}),
                ...(params.message !== undefined ? { message: params.message } : {}),
                ...(params.isPublished !== undefined
                  ? { isPublished: params.isPublished }
                  : {}),
              }
            : a
        )
      );
      return true;
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
      return false;
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await AnnouncementService.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
      return false;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        announcements,
        isLoading,
        errorMessage,
        unreadCount,
        loadAnnouncements,
        markAsRead,
        markAllAsRead,
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
};
