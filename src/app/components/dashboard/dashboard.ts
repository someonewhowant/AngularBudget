import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { BaseChartComponent } from '../base-chart/base-chart';
import { combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent, BaseChartComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  private store = inject(StoreService);

  state$ = this.store.getState();
  summary$ = this.store.getSummary$();
  savingsGoals$ = this.state$.pipe(map(s => s.savingsGoals));

  chartData$ = this.state$.pipe(
    map(state => {
      const transactions = state.transactions;
      const days = 7;
      const last7Days = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return d.toISOString().split('T')[0];
      });

      const dailySpending = last7Days.map(date => {
        return transactions
          .filter(t => t.date === date && t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      });

      return {
        labels: last7Days.map(d => d.split('-').slice(1).reverse().join('.')),
        datasets: [{
          label: 'Daily Spending',
          data: dailySpending,
          borderColor: '#0d59f2',
          backgroundColor: 'rgba(13, 89, 242, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#0d59f2',
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
          borderWidth: 3
        }]
      };
    })
  );

  topCategories$ = this.state$.pipe(
    map(state => {
      const transactions = state.transactions;
      const categoryTotals = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc: Record<string, number>, t) => {
          const val = Number(t.amount || 0);
          acc[t.category] = (acc[t.category] || 0) + val;
          return acc;
        }, {});

      const totalExpense = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0) || 1;

      return Object.entries(categoryTotals)
        .map(([name, amount]) => ({
          name,
          amount,
          percent: Math.round((amount / totalExpense) * 100)
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);
    })
  );

  recentTransactions$ = this.state$.pipe(
    map(state => state.transactions.slice(0, 5))
  );

  protected Math = Math;

  ngOnInit(): void { }
}
