import { computed, Injectable, signal } from '@angular/core';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signOut, User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  role: 'admin' | 'student';
  subscribed: boolean;
  progress: Record<string, boolean>;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  referralRewarded: boolean;
  stripeCustomerId: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _auth = getAuth();
  private _db   = getFirestore();

  private _user    = signal<AppUser | null>(null);
  private _loading = signal(true);

  readonly user         = this._user.asReadonly();
  readonly loading      = this._loading.asReadonly();
  readonly isLoggedIn   = computed(() => this._user() !== null);
  readonly isAdmin      = computed(() => this._user()?.role === 'admin');
  readonly isSubscribed = computed(() => this._user()?.subscribed ?? false);
  readonly progress     = computed(() => this._user()?.progress ?? {});

  // Resolves once Firebase has determined the initial auth state
  readonly ready: Promise<void>;

  constructor() {
    let resolveReady!: () => void;
    this.ready = new Promise<void>(r => (resolveReady = r));

    onAuthStateChanged(this._auth, async firebaseUser => {
      if (firebaseUser) {
        const user = await this._loadOrCreate(firebaseUser);
        this._user.set(user);
      } else {
        this._user.set(null);
      }
      this._loading.set(false);
      resolveReady();
    });
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this._auth, provider);
    // onAuthStateChanged handles user state update
  }

  async logout(): Promise<void> {
    await signOut(this._auth);
  }

  async markLessonComplete(lessonId: number): Promise<void> {
    const uid = this._user()?.uid;
    if (!uid) return;
    const key = String(lessonId);
    await updateDoc(doc(this._db, 'users', uid), { [`progress.${key}`]: true });
    this._user.update(u => u ? { ...u, progress: { ...u.progress, [key]: true } } : u);
  }

  private async _loadOrCreate(fbUser: FirebaseUser): Promise<AppUser> {
    const ref  = doc(this._db, 'users', fbUser.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return { uid: fbUser.uid, ...snap.data() } as AppUser;
    }

    const referredBy = this._getRefCode();

    const newUser = {
      name:             fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Student',
      email:            fbUser.email ?? '',
      photoURL:         fbUser.photoURL,
      role:             'student' as const,
      subscribed:       false,
      progress:         {},
      referralCode:     fbUser.uid.slice(0, 8).toUpperCase(),
      referredBy:       referredBy,
      referralCount:    0,
      referralRewarded: false,
      stripeCustomerId: null,
      createdAt:        serverTimestamp(),
    };
    await setDoc(ref, newUser);
    return { uid: fbUser.uid, ...newUser };
  }

  private _getRefCode(): string | null {
    // Hash routing: window.location.hash = '#/login?ref=ABC123'
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return null;
    return new URLSearchParams(hash.slice(qIdx + 1)).get('ref');
  }
}
