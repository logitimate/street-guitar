import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  imports: [RouterLink],
})
export class ForgotPassword {
  private auth = inject(AuthService);

  loading = signal(false);
  sent = signal(false);
  sentTo = signal('');

  async submit(emailInput: HTMLInputElement) {
    const email = emailInput.value.trim();
    if (!email) return;
    this.loading.set(true);
    await this.auth.sendPasswordReset(email);
    this.loading.set(false);
    this.sentTo.set(email);
    this.sent.set(true);
  }
}
