import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AsyncState } from '../../utils/async-state';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [RouterLink],
})
export class Login {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  private _state = new AsyncState();
  loading = this._state.loading;
  error   = this._state.error;

  async signInWithGoogle() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.signInWithGoogle();
      const raw       = this.route.snapshot.queryParams['returnUrl'] ?? '/learn';
      const returnUrl = raw.startsWith('/') ? raw : '/learn';
      this.router.navigateByUrl(returnUrl);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      const cancelled = msg.includes('popup-closed-by-user') ||
                        msg.includes('cancelled-popup-request');
      if (!cancelled) this.error.set('Sign-in failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
