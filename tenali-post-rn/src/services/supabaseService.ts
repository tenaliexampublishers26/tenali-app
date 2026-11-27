import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConstants } from '../core/constants';

export interface SupabaseConnectionResult {
  isClientInitialized: boolean;
  isDatabaseReachable: boolean;
  status: string;
  message: string;
  latencyMs?: number;
}

class SupabaseServiceClass {
  private _client: SupabaseClient | null = null;
  private _isInitialized = false;

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get client(): SupabaseClient | null {
    return this._isInitialized ? this._client : null;
  }

  async initialize(supabaseUrl?: string, supabaseAnonKey?: string): Promise<void> {
    if (this._isInitialized) return;

    const url = (supabaseUrl ?? AppConstants.supabaseUrl).trim();
    const anonKey = (supabaseAnonKey ?? AppConstants.supabaseAnonKey).trim();

    if (url && anonKey && !url.includes('placeholder')) {
      try {
        this._client = createClient(url, anonKey, {
          auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        });
        this._isInitialized = true;
      } catch (e) {
        this._isInitialized = false;
        console.warn('[SupabaseService] Initialization warning, operating with local fallback:', e);
      }
    } else {
      this._isInitialized = false;
    }
  }

  async testConnection(): Promise<SupabaseConnectionResult> {
    if (!this._isInitialized || !this._client) {
      return {
        isClientInitialized: false,
        isDatabaseReachable: false,
        status: 'Client Not Initialized',
        message: 'Supabase client has not been initialized. Check credentials in AppConstants.',
      };
    }

    const start = Date.now();
    try {
      const { error } = await this._client.from('exams').select('id').limit(1);
      const latencyMs = Date.now() - start;

      if (error) {
        const msgLower = (error.message || '').toLowerCase();
        const isTableMissing =
          error.code === '42P01' ||
          error.code === 'PGRST205' ||
          msgLower.includes('schema cache') ||
          msgLower.includes('relation') ||
          msgLower.includes('does not exist');

        return {
          isClientInitialized: true,
          isDatabaseReachable: true,
          status: isTableMissing ? 'Reachable (Schema Pending)' : `Server Reachable (${error.code ?? 'ERR'})`,
          message: isTableMissing
            ? `Supabase server reached in ${latencyMs}ms! Schema migration is pending.`
            : `Supabase server responded in ${latencyMs}ms: ${error.message}`,
          latencyMs,
        };
      }

      return {
        isClientInitialized: true,
        isDatabaseReachable: true,
        status: 'Online & Verified',
        message: `Successfully reached Supabase project at ${AppConstants.supabaseUrl} in ${latencyMs}ms.`,
        latencyMs,
      };
    } catch (e: any) {
      const latencyMs = Date.now() - start;
      return {
        isClientInitialized: true,
        isDatabaseReachable: false,
        status: 'Network Query Failed',
        message: `Client is initialized, but network query failed after ${latencyMs}ms: ${e?.message ?? e}`,
        latencyMs,
      };
    }
  }
}

export const SupabaseService = new SupabaseServiceClass();
