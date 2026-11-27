import { AppConstants } from '../core/constants';
import {
  isUserAdmin,
  UserProfile,
  userProfileFromJson,
} from '../models';
import { SupabaseService } from './supabaseService';

class AuthServiceClass {
  private _currentUser: UserProfile | null = null;
  private _isAdmin = false;
  private _isLocalSession = false;

  get currentUser(): UserProfile | null {
    return this._currentUser;
  }
  get isAuthenticated(): boolean {
    return this._currentUser !== null;
  }
  get isAdmin(): boolean {
    return this._isAdmin;
  }
  get isLocalSession(): boolean {
    return this._isLocalSession;
  }

  isAuthorizedAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();
    return (
      normalized === AppConstants.authorizedAdminEmail.toLowerCase() ||
      normalized === AppConstants.legacyAdminEmail.toLowerCase()
    );
  }

  async restoreSession(): Promise<UserProfile | null> {
    if (this._isLocalSession && this._currentUser) {
      return this._currentUser;
    }

    const client = SupabaseService.client;
    if (!client) return this._currentUser;

    try {
      const { data } = await client.auth.getSession();
      const user = data.session?.user;
      if (user) {
        const profile = await this.fetchProfile(
          user.id,
          user.email,
          user.user_metadata?.full_name
        );
        this._currentUser = profile;
        this._isAdmin = await this.verifyAdminStatus(user.id, user.email);
        return this._currentUser;
      }
    } catch (e) {
      console.warn('[AuthService] Error restoring session:', e);
    }

    return this._currentUser;
  }

  async signInWithPassword(email: string, password: string): Promise<UserProfile> {
    const client = SupabaseService.client;
    const trimmedEmail = email.trim();

    if (trimmedEmail.toLowerCase() === AppConstants.exampleLoginEmail) {
      if (password !== AppConstants.exampleLoginPassword) {
        throw new Error(
          `Invalid password for ${AppConstants.exampleLoginEmail}. Use ${AppConstants.exampleLoginPassword}.`
        );
      }
      this._isLocalSession = true;
      this._isAdmin = false;
      this._currentUser = {
        id: 'example-student-01',
        email: AppConstants.exampleLoginEmail,
        fullName: 'Example Candidate',
        phoneNumber: '9876543210',
        location: 'Tenali Postal Division',
        postalCircle: 'Andhra Pradesh Circle',
        role: 'student',
        createdAt: new Date().toISOString(),
      };
      return this._currentUser;
    }

    if (
      this.isAuthorizedAdminEmail(trimmedEmail) &&
      password === AppConstants.exampleAdminPassword
    ) {
      this._isLocalSession = true;
      this._isAdmin = true;
      this._currentUser = {
        id: 'admin-01',
        email: AppConstants.authorizedAdminEmail,
        fullName: 'Tenali Postal Admin',
        phoneNumber: '9988776655',
        location: 'Headquarters',
        postalCircle: 'Headquarters',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      return this._currentUser;
    }

    if (!client) {
      this._isLocalSession = true;
      const adminCheck = this.isAuthorizedAdminEmail(trimmedEmail);
      this._isAdmin = adminCheck;
      this._currentUser = {
        id: adminCheck ? 'admin-01' : `user-${trimmedEmail.length}`,
        email: trimmedEmail,
        fullName: adminCheck ? 'Tenali Postal Admin' : 'Postal Candidate',
        phoneNumber: null,
        location: null,
        role: adminCheck ? 'admin' : 'student',
        createdAt: new Date().toISOString(),
      };
      return this._currentUser;
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Authentication failed: No user returned from server.');

    this._isLocalSession = false;
    this._isAdmin = await this.verifyAdminStatus(data.user.id, data.user.email);
    const profile = await this.fetchProfile(
      data.user.id,
      data.user.email,
      data.user.user_metadata?.full_name
    );
    this._currentUser = profile;
    return profile;
  }

  async signUp(fullName: string, email: string, password: string): Promise<UserProfile> {
    const client = SupabaseService.client;
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!client) {
      const adminCheck = this.isAuthorizedAdminEmail(trimmedEmail);
      this._isAdmin = adminCheck;
      this._currentUser = {
        id: `user-${Date.now()}`,
        email: trimmedEmail,
        fullName: trimmedName,
        role: adminCheck ? 'admin' : 'student',
        createdAt: new Date().toISOString(),
      };
      return this._currentUser;
    }

    const { data, error } = await client.auth.signUp({
      email: trimmedEmail,
      password,
      options: { data: { full_name: trimmedName } },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Registration failed: User could not be created.');

    this._isAdmin = await this.verifyAdminStatus(data.user.id, data.user.email);
    const initialProfile: UserProfile = {
      id: data.user.id,
      email: data.user.email ?? trimmedEmail,
      fullName: trimmedName,
      role: this._isAdmin ? 'admin' : 'student',
      createdAt: new Date().toISOString(),
    };

    try {
      await this.saveProfile(initialProfile);
    } catch (e) {
      console.warn('[AuthService] Could not write initial profile to DB:', e);
    }

    this._currentUser = initialProfile;
    return initialProfile;
  }

  async fetchProfile(
    userId: string,
    defaultEmail?: string | null,
    defaultFullName?: string | null
  ): Promise<UserProfile> {
    const client = SupabaseService.client;
    if (!client) {
      return (
        this._currentUser ?? {
          id: userId,
          email: defaultEmail ?? '',
          fullName: defaultFullName ?? 'Candidate',
          role: 'student',
          createdAt: new Date().toISOString(),
        }
      );
    }

    try {
      const { data } = await client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        return userProfileFromJson(data);
      }
    } catch (e) {
      console.warn('[AuthService] Error fetching profile:', e);
    }

    return {
      id: userId,
      email: defaultEmail ?? '',
      fullName: defaultFullName ?? 'Candidate',
      role: this._isAdmin ? 'admin' : 'student',
      createdAt: new Date().toISOString(),
    };
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const client = SupabaseService.client;
    this._currentUser = profile;

    if (client && !this._isLocalSession) {
      const { error } = await client.from('profiles').upsert({
        id: profile.id,
        email: profile.email,
        full_name: profile.fullName.trim(),
        phone_number: profile.phoneNumber?.trim() ?? null,
        location: profile.location?.trim() ?? null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }

    return profile;
  }

  async verifyAdminStatus(userId: string, email?: string | null): Promise<boolean> {
    const client = SupabaseService.client;
    if (client) {
      try {
        const { data: userRow } = await client
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        if (userRow && String(userRow.role ?? '').toLowerCase() === 'admin') {
          return true;
        }
      } catch {
        // ignore
      }
    }

    if (!this.isAuthorizedAdminEmail(email)) return false;
    if (!client) return this.isAuthorizedAdminEmail(email);

    try {
      const { data: adminRow } = await client
        .from('admin_users')
        .select('user_id, role')
        .eq('user_id', userId)
        .maybeSingle();
      if (adminRow) return true;

      const { data } = await client.auth.getUser();
      if (this.isAuthorizedAdminEmail(data.user?.email)) return true;
    } catch {
      return this.isAuthorizedAdminEmail(email);
    }
    return false;
  }

  async signOut(): Promise<void> {
    const client = SupabaseService.client;
    if (client && !this._isLocalSession) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn('[AuthService] Error during signOut:', e);
      }
    }
    this._isLocalSession = false;
    this._currentUser = null;
    this._isAdmin = false;
  }

  setCurrentUser(user: UserProfile | null, isAdmin?: boolean): void {
    this._currentUser = user;
    this._isAdmin = isAdmin !== undefined ? isAdmin : isUserAdmin(user);
  }
}

export const AuthService = new AuthServiceClass();
