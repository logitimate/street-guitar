import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [RouterLink],
})
export class Login {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  async submit(email: HTMLInputElement, password: HTMLInputElement) {
    this.error.set('');
    if (!email.value || !password.value) {
      this.error.set('Please enter your email and password.');
      return;
    }
    this.loading.set(true);
    const result = await this.auth.login(email.value, password.value);
    this.loading.set(false);
    if (result.success) {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? 'learn';
      this.router.navigate([`/${returnUrl}`]);
    } else {
      this.error.set(result.error ?? 'Something went wrong. Please try again.');
    }
  }
}
