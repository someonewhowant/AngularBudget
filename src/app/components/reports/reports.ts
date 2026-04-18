import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { BaseChartComponent } from '../base-chart/base-chart';
import { map, combineLatest } from 'rxjs';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, SidebarComponent, BaseChartComponent],
  templateUrl: './reports.html',
})
export class ReportsComponent implements OnInit {
  private store = inject(StoreService);

  state$ = this.store.getState();
  summary$ = this.store.getSummary$();

  // Color palette for chart categories
  private colors = [
    '#0d59f2', '#bc13fe', '#00f2fe', '#f20d59', '#f2bc0d',
    '#0df2bc', '#bc0df2', '#59f20d', '#590df2', '#f2590d'
  ];

  categoryChartData$ = this.state$.pipe(
    map(state => {
      const categoryTotals = state.transactions
        .filter(t => t.type === 'expense')
        .reduce((acc: Record<string, number>, t) => {
          acc[t.category] = (acc[t.category] || 0) + Number(t.amount || 0);
          return acc;
        }, {});

      return {
        labels: Object.keys(categoryTotals),
        datasets: [{
          data: Object.values(categoryTotals),
          backgroundColor: this.colors.slice(0, Object.keys(categoryTotals).length),
          borderWidth: 0,
          hoverOffset: 10
        }]
      };
    })
  );

  incomeVsExpenseData$ = this.state$.pipe(
    map(state => {
      const transactions = state.transactions;

      // Group by month (last 6 months)
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return d.toISOString().substring(0, 7); // YYYY-MM
      });

      const income = months.map(m =>
        transactions
          .filter(t => t.date.startsWith(m) && t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0)
      );

      const expense = months.map(m =>
        transactions
          .filter(t => t.date.startsWith(m) && t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0)
      );

      return {
        labels: months.map(m => {
          const [y, mm] = m.split('-');
          return new Date(parseInt(y), parseInt(mm) - 1).toLocaleString('default', { month: 'short' });
        }),
        datasets: [
          {
            label: 'Income',
            data: income,
            backgroundColor: '#0d59f2',
            borderRadius: 5
          },
          {
            label: 'Expense',
            data: expense,
            backgroundColor: '#bc13fe',
            borderRadius: 5
          }
        ]
      };
    })
  );

  trendData$ = this.state$.pipe(
    map(state => {
      const transactions = state.transactions;
      const days = 14;
      const last14Days = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return d.toISOString().split('T')[0];
      });

      const dailySpending = last14Days.map(date =>
        transactions
          .filter(t => t.date === date && t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0)
      );

      return {
        labels: last14Days.map(d => d.split('-').slice(1).reverse().join('.')),
        datasets: [{
          label: 'Spending Trend',
          data: dailySpending,
          borderColor: '#0d59f2',
          backgroundColor: 'rgba(13, 89, 242, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#0d59f2',
          borderWidth: 3
        }]
      };
    })
  );

  ngOnInit(): void { }
}
