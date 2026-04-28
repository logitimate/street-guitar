import { computed, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, PercentPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export type ViewMode = 'all' | 'online' | 'inperson';
export interface MonthRevenue { month: string; revenue: number; }
export interface Enrollment   { name: string; type: 'Online' | 'In-Person'; date: string; amount: number; status: 'Active' | 'Cancelled'; }

interface Metrics {
  mrr: number; mrrGrowth: number | null;
  arr: number; projectedYearEnd: number;
  totalSubscribers: number; subscriberGrowth: number;
  churnRate: number; churnedThisMonth: number;
  arpu: number; ltv: number;
  waitlist?: number; trialConversion?: number;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrl:    './admin-dashboard.css',
  imports: [RouterLink, CurrencyPipe, PercentPipe, DatePipe],
})
export class AdminDashboard {
  auth   = inject(AuthService);
  router = inject(Router);
  today  = new Date();

  logout() { this.auth.logout(); this.router.navigate(['/login']); }

  /* ── View toggle ─────────────────────────────────────── */
  selectedView = signal<ViewMode>('all');

  setView(v: ViewMode) { this.selectedView.set(v); }

  /* ── Per-view metrics ────────────────────────────────── */
  private metricsMap: Record<ViewMode, Metrics> = {
    all: {
      mrr: 3_151,   mrrGrowth: 8.0,
      arr: 37_812,  projectedYearEnd: 48_600,
      totalSubscribers: 59, subscriberGrowth: 6,
      churnRate: 0.032,   churnedThisMonth: 2,
      arpu: 53.40,  ltv: 534,
      waitlist: 23, trialConversion: 0.68,
    },
    online: {
      mrr: 1_363,   mrrGrowth: 6.4,
      arr: 16_356,  projectedYearEnd: 19_800,
      totalSubscribers: 47, subscriberGrowth: 4,
      churnRate: 0.043,   churnedThisMonth: 2,
      arpu: 29,     ltv: 290,
      trialConversion: 0.68,
    },
    inperson: {
      mrr: 1_788,   mrrGrowth: null,          // net flat this month
      arr: 21_456,  projectedYearEnd: 28_800,
      totalSubscribers: 12, subscriberGrowth: 0,
      churnRate: 0,         churnedThisMonth: 0,
      arpu: 149,    ltv: 1_788,
      waitlist: 23,
    },
  };

  currentMetrics = computed<Metrics>(() => this.metricsMap[this.selectedView()]);

  /* ── Per-view monthly revenue ────────────────────────── */
  private revenueMap: Record<ViewMode, MonthRevenue[]> = {
    all: [
      { month: 'Sep', revenue: 980  }, { month: 'Oct', revenue: 1_240 },
      { month: 'Nov', revenue: 1_580 }, { month: 'Dec', revenue: 1_920 },
      { month: 'Jan', revenue: 2_340 }, { month: 'Feb', revenue: 2_680 },
      { month: 'Mar', revenue: 2_920 }, { month: 'Apr', revenue: 3_151 },
    ],
    online: [
      { month: 'Sep', revenue: 580  }, { month: 'Oct', revenue: 725  },
      { month: 'Nov', revenue: 870  }, { month: 'Dec', revenue: 1_015 },
      { month: 'Jan', revenue: 1_102 }, { month: 'Feb', revenue: 1_189 },
      { month: 'Mar', revenue: 1_276 }, { month: 'Apr', revenue: 1_363 },
    ],
    inperson: [
      { month: 'Sep', revenue: 400  }, { month: 'Oct', revenue: 515  },
      { month: 'Nov', revenue: 710  }, { month: 'Dec', revenue: 905  },
      { month: 'Jan', revenue: 1_238 }, { month: 'Feb', revenue: 1_491 },
      { month: 'Mar', revenue: 1_644 }, { month: 'Apr', revenue: 1_788 },
    ],
  };

  currentRevenue  = computed(() => this.revenueMap[this.selectedView()]);
  maxRevenue      = computed(() => Math.max(...this.currentRevenue().map(m => m.revenue)));
  barHeightPct(rev: number) { return Math.round((rev / this.maxRevenue()) * 100); }

  /* ── Enrollments ─────────────────────────────────────── */
  private allEnrollments: Enrollment[] = [
    { name: 'Sarah Mitchell',   type: 'Online',    date: 'Apr 22, 2026', amount: 29,  status: 'Active'    },
    { name: 'Tom Hendricks',    type: 'In-Person', date: 'Apr 21, 2026', amount: 149, status: 'Active'    },
    { name: 'Marcy Alvarez',    type: 'Online',    date: 'Apr 19, 2026', amount: 29,  status: 'Active'    },
    { name: 'Derek Simmons',    type: 'Online',    date: 'Apr 18, 2026', amount: 29,  status: 'Active'    },
    { name: 'Christine Fuller', type: 'In-Person', date: 'Apr 17, 2026', amount: 149, status: 'Active'    },
    { name: 'Ryan Kowalski',    type: 'Online',    date: 'Apr 15, 2026', amount: 29,  status: 'Cancelled' },
    { name: 'Lisa Tran',        type: 'Online',    date: 'Apr 12, 2026', amount: 29,  status: 'Active'    },
    { name: 'Marcus Webb',      type: 'In-Person', date: 'Apr 10, 2026', amount: 149, status: 'Active'    },
  ];

  currentEnrollments = computed(() => {
    const v = this.selectedView();
    if (v === 'all')      return this.allEnrollments;
    if (v === 'online')   return this.allEnrollments.filter(e => e.type === 'Online');
    return this.allEnrollments.filter(e => e.type === 'In-Person');
  });

  /* ── Subscriber breakdown proportions (for "all" view) ─ */
  onlineShare    = 47 / 59;
  inPersonShare  = 12 / 59;
}
