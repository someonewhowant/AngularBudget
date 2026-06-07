import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { BaseChartComponent } from '../base-chart/base-chart';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, SidebarComponent, BaseChartComponent],
  templateUrl: './reports.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsComponent {
  private store = inject(StoreService);

  summary = this.store.summary;
  currencySymbol = this.store.currencySymbol;
  accounts = this.store.accounts;

  // Filter signals
  selectedPeriod = signal<string>('thisMonth');
  selectedAccount = signal<string>('all');
  selectedCategory = signal<string>('all');
  customStartDate = signal<string>('');
  customEndDate = signal<string>('');

  allCategories = computed(() => {
    return Array.from(new Set([
      ...this.store.expenseCategories(),
      ...this.store.incomeCategories()
    ]));
  });

  // Color palette for chart categories
  private colors = [
    '#0d59f2', '#bc13fe', '#00f2fe', '#f20d59', '#f2bc0d',
    '#0df2bc', '#bc0df2', '#59f20d', '#590df2', '#f2590d'
  ];

  resetFilters() {
    this.selectedPeriod.set('thisMonth');
    this.selectedAccount.set('all');
    this.selectedCategory.set('all');
    this.customStartDate.set('');
    this.customEndDate.set('');
  }

  filteredTransactions = computed(() => {
    let txs = this.store.transactions();
    
    // 1. Account Filter
    const acc = this.selectedAccount();
    if (acc !== 'all') {
      txs = txs.filter(t => t.account === acc);
    }
    
    // 2. Category Filter
    const cat = this.selectedCategory();
    if (cat !== 'all') {
      txs = txs.filter(t => t.category === cat);
    }
    
    // 3. Date Filter
    const period = this.selectedPeriod();
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    
    if (period === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'lastMonth') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === 'last3Months') {
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else if (period === 'last6Months') {
      start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    } else if (period === 'yearToDate') {
      start = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'custom') {
      const sStr = this.customStartDate();
      const eStr = this.customEndDate();
      if (sStr) start = new Date(sStr);
      if (eStr) end = new Date(eStr);
    }
    
    if (start) {
      start.setHours(0, 0, 0, 0);
      txs = txs.filter(t => new Date(t.date) >= start!);
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
      txs = txs.filter(t => new Date(t.date) <= end!);
    }
    
    return txs;
  });

  filteredSummary = computed(() => {
    const txs = this.filteredTransactions();
    const income = txs
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expense = txs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const profit = income - expense;
    const savingsRate = income > 0 ? (profit / income) * 100 : 0;
    return { income, expense, profit, savingsRate };
  });

  categoryChartData = computed(() => {
    const transactions = this.filteredTransactions();
    const categoryTotals = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc: Record<string, number>, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount || 0);
        return acc;
      }, {});

    const labels = Object.keys(categoryTotals);
    if (labels.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [0],
          backgroundColor: ['rgba(255, 255, 255, 0.05)'],
          borderWidth: 0
        }]
      };
    }

    return {
      labels,
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: this.colors.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 10
      }]
    };
  });

  incomeVsExpenseData = computed(() => {
    const transactions = this.filteredTransactions();
    const period = this.selectedPeriod();
    const now = new Date();
    let months: string[] = [];

    const getLocalYYYYMM = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    };

    if (period === 'thisMonth') {
      months = [getLocalYYYYMM(now)];
    } else if (period === 'lastMonth') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      months = [getLocalYYYYMM(d)];
    } else if (period === 'last3Months') {
      months = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
        return getLocalYYYYMM(d);
      });
    } else if (period === 'last6Months') {
      months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return getLocalYYYYMM(d);
      });
    } else if (period === 'yearToDate') {
      const currentMonth = now.getMonth();
      months = Array.from({ length: currentMonth + 1 }, (_, i) => {
        const d = new Date(now.getFullYear(), i, 1);
        return getLocalYYYYMM(d);
      });
    } else {
      // custom
      const monthsSet = new Set<string>();
      transactions.forEach(t => {
        if (t.date) monthsSet.add(t.date.substring(0, 7));
      });
      months = Array.from(monthsSet).sort();
      if (months.length === 0) {
        months = [getLocalYYYYMM(now)];
      }
    }

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
        return new Date(parseInt(y), parseInt(mm) - 1).toLocaleString('default', { month: 'short' }) + ' ' + y.substring(2);
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
  });

  trendData = computed(() => {
    const transactions = this.filteredTransactions();
    const period = this.selectedPeriod();
    const now = new Date();
    let dates: string[] = [];

    const getLocalYYYYMMDD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (period === 'thisMonth') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      dates = Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
        return getLocalYYYYMMDD(d);
      });
    } else if (period === 'lastMonth') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      dates = Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, i + 1);
        return getLocalYYYYMMDD(d);
      });
    } else {
      if (transactions.length > 0) {
        let minDate = transactions[0].date;
        let maxDate = transactions[0].date;
        transactions.forEach(t => {
          if (t.date < minDate) minDate = t.date;
          if (t.date > maxDate) maxDate = t.date;
        });
        
        const start = new Date(minDate);
        const end = new Date(maxDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Limit to max 31 days to avoid clutter, taking the most recent ones
        const days = Math.min(diffDays + 1, 31);
        dates = Array.from({ length: days }, (_, i) => {
          const d = new Date(end);
          d.setDate(d.getDate() - (days - 1 - i));
          return getLocalYYYYMMDD(d);
        });
      } else {
        const days = 14;
        dates = Array.from({ length: days }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (days - 1 - i));
          return getLocalYYYYMMDD(d);
        });
      }
    }

    const dailySpending = dates.map(date =>
      transactions
        .filter(t => t.date === date && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    );

    return {
      labels: dates.map(d => d.split('-').slice(1).reverse().join('.')),
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
  });
}
