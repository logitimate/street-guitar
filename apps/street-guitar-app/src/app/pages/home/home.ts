import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  imports: [RouterLink],
})
export class Home {
  auth = inject(AuthService);
  private router = inject(Router);

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
