import { computed, Injectable, signal } from '@angular/core';

export interface User {
  name: string;
  email: string;
  role: 'admin' | 'student';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin    = computed(() => this._user()?.role === 'admin');

  login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    return new Promise(resolve => {
      setTimeout(() => {
        if (!email || !password) {
          resolve({ success: false, error: 'Please enter your email and password.' });
          return;
        }
        const role: 'admin' | 'student' = email.toLowerCase().includes('admin') ? 'admin' : 'student';
        const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        this._user.set({ name, email, role });
        resolve({ success: true });
      }, 900);
    });
  }

  logout() {
    this._user.set(null);
  }

  sendPasswordReset(_email: string): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 900));
  }
}
