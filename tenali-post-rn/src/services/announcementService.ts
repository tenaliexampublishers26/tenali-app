import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataSync } from '../core/utils/dataSync';
import { Announcement, announcementFromJson } from '../models';
import { AuthService } from './authService';
import { SupabaseService } from './supabaseService';

const ANNOUNCEMENTS_STORAGE_KEY = 'tenali_post_announcements_v1';

class AnnouncementServiceClass {
  private _localAnnouncements: Announcement[] = [];
  private _localReadIds = new Set<string>();
  private _hydrated = false;

  private async _hydrate(): Promise<void> {
    if (this._hydrated) return;
    this._hydrated = true;
    try {
      const raw = await AsyncStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this._localAnnouncements = parsed.map((a) => announcementFromJson(a));
        }
      }
    } catch {
      // ignore hydration errors
    }
  }

  private async _persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        ANNOUNCEMENTS_STORAGE_KEY,
        JSON.stringify(this._localAnnouncements)
      );
    } catch {
      // ignore persist errors
    }
  }

  async fetchAnnouncements(userId?: string | null, isAdmin = false): Promise<Announcement[]> {
    await this._hydrate();
    const client = SupabaseService.client;
    if (!client || AuthService.isLocalSession) {
      return this._getLocalAnnouncements(isAdmin);
    }

    try {
      let query = client.from('announcements').select();
      if (!isAdmin) {
        query = query.eq('is_published', true);
      }
      const { data, error } = await query.order('published_at', { ascending: false });
      if (error) throw error;

      const readIds = new Set<string>(this._localReadIds);
      if (userId) {
        try {
          const { data: readsData } = await client
            .from('announcement_reads')
            .select('announcement_id')
            .eq('user_id', userId);
          for (const row of readsData ?? []) {
            if (row.announcement_id) readIds.add(String(row.announcement_id));
          }
        } catch {
          // fallback to local cache
        }
      }

      return (data ?? []).map((json: any) =>
        announcementFromJson(json, readIds.has(String(json.id ?? '')))
      );
    } catch (e) {
      console.warn('[AnnouncementService] Fallback to local announcements:', e);
      return this._getLocalAnnouncements(isAdmin);
    }
  }

  private _getLocalAnnouncements(isAdmin: boolean): Announcement[] {
    return this._localAnnouncements
      .filter((a) => isAdmin || a.isPublished)
      .map((a) => ({ ...a, isRead: this._localReadIds.has(a.id) }));
  }

  async markAsRead(announcementId: string, userId: string): Promise<void> {
    this._localReadIds.add(announcementId);
    const client = SupabaseService.client;
    if (!client || !userId || AuthService.isLocalSession) return;

    try {
      await client.from('announcement_reads').upsert({
        announcement_id: announcementId,
        user_id: userId,
        read_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[AnnouncementService] markAsRead error:', e);
    }
  }

  async markAllAsRead(announcementIds: string[], userId: string): Promise<void> {
    announcementIds.forEach((id) => this._localReadIds.add(id));
    const client = SupabaseService.client;
    if (!client || !userId || !announcementIds.length || AuthService.isLocalSession) return;

    try {
      const now = new Date().toISOString();
      const records = announcementIds.map((aid) => ({
        announcement_id: aid,
        user_id: userId,
        read_at: now,
      }));
      await client.from('announcement_reads').upsert(records);
    } catch (e) {
      console.warn('[AnnouncementService] markAllAsRead error:', e);
    }
  }

  async createAnnouncement(params: {
    title: string;
    message: string;
    isPublished?: boolean;
    createdBy?: string;
  }): Promise<Announcement> {
    await this._hydrate();
    const client = SupabaseService.client;
    const now = new Date().toISOString();
    const localItem: Announcement = {
      id: `ann_${Date.now()}`,
      title: params.title.trim(),
      message: params.message.trim(),
      isPublished: params.isPublished ?? true,
      publishedAt: now,
      createdAt: now,
      createdBy: params.createdBy ?? null,
      isRead: false,
    };

    if (client && !AuthService.isLocalSession) {
      try {
        const { data, error } = await client
          .from('announcements')
          .insert({
            title: localItem.title,
            message: localItem.message,
            is_published: localItem.isPublished,
            published_at: now,
            created_at: now,
            ...(params.createdBy ? { created_by: params.createdBy } : {}),
          })
          .select()
          .single();
        if (!error && data) {
          const created = announcementFromJson(data);
          this._localAnnouncements.unshift(created);
          await this._persist();
          DataSync.emit('announcements');
          return created;
        }
      } catch (e) {
        console.warn('[AnnouncementService] createAnnouncement fallback:', e);
      }
    }

    this._localAnnouncements.unshift(localItem);
    await this._persist();
    DataSync.emit('announcements');
    return localItem;
  }

  async updateAnnouncement(params: {
    id: string;
    title?: string;
    message?: string;
    isPublished?: boolean;
  }): Promise<void> {
    await this._hydrate();
    const idx = this._localAnnouncements.findIndex((a) => a.id === params.id);
    if (idx !== -1) {
      this._localAnnouncements[idx] = {
        ...this._localAnnouncements[idx],
        ...(params.title !== undefined ? { title: params.title } : {}),
        ...(params.message !== undefined ? { message: params.message } : {}),
        ...(params.isPublished !== undefined ? { isPublished: params.isPublished } : {}),
      };
      await this._persist();
    }

    const client = SupabaseService.client;
    if (client && !AuthService.isLocalSession) {
      try {
        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (params.title !== undefined) updates.title = params.title.trim();
        if (params.message !== undefined) updates.message = params.message.trim();
        if (params.isPublished !== undefined) updates.is_published = params.isPublished;
        await client.from('announcements').update(updates).eq('id', params.id);
      } catch (e) {
        console.warn('[AnnouncementService] updateAnnouncement fallback:', e);
      }
    }
    DataSync.emit('announcements');
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this._hydrate();
    this._localAnnouncements = this._localAnnouncements.filter((a) => a.id !== id);
    this._localReadIds.delete(id);
    await this._persist();

    const client = SupabaseService.client;
    if (client && !AuthService.isLocalSession) {
      try {
        await client.from('announcements').delete().eq('id', id);
      } catch (e) {
        console.warn('[AnnouncementService] deleteAnnouncement fallback:', e);
      }
    }
    DataSync.emit('announcements');
  }
}

export const AnnouncementService = new AnnouncementServiceClass();
