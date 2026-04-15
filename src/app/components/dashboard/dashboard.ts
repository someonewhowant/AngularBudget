import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../services/store.service';
import { BaseChartComponent } from '../base-chart/base-chart';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButtons, 
  IonMenuButton,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { menuOutline, pricetagOutline } from 'ionicons/icons';
import { map } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    BaseChartComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonIcon
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  public store = inject(StoreService);
  
  summary$ = this.store.getSummary$();
  state$ = this.store.getState();
  
  chartData$ = this.state$.pipe(
    map(state => {
      const transactions = state.transactions;
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      const dailySpending = last7Days.map(date => {
        return transactions
          .filter(t => t.date === date && t.type === 'expense')
          .reduce((sum, t) => {
            const val = parseFloat(t.amount.toString());
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
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
      const categories = Object.entries(
        transactions
          .filter(t => t.type === 'expense')
          .reduce((acc: any, t) => {
            const val = parseFloat(t.amount.toString());
            acc[t.category] = (acc[t.category] || 0) + (isNaN(val) ? 0 : val);
            return acc;
          }, {})
      )
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3);
      
      const summary = this.store.getSummary();
      const totalExpense = summary.expense || 1;
      
      return categories.map(([cat, amt]: any) => ({
        name: cat,
        amount: amt,
        percent: Math.round((amt / totalExpense) * 100)
      }));
    })
  );

  recentTransactions$ = this.state$.pipe(
    map(state => state.transactions.slice(0, 5))
  );

  constructor() {
    addIcons({ menuOutline, pricetagOutline });
  }

  ngOnInit(): void {}
}
