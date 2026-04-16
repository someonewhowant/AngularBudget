import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { BaseChartComponent } from '../base-chart/base-chart';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/angular/standalone';
import { map } from 'rxjs';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonGrid,
    IonRow,
    IonCol
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class ReportsComponent implements OnInit {
  private store = inject(StoreService);
  state$ = this.store.getState();

  categoryData$ = this.state$.pipe(
    map(state => {
      const cats: any = {};
      state.transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          const amt = parseFloat(t.amount.toString());
          cats[t.category] = (cats[t.category] || 0) + amt;
        });

      return {
        labels: Object.keys(cats),
        datasets: [{
          data: Object.values(cats),
          backgroundColor: [
            '#0d59f2', '#bc13fe', '#00d2ff', '#2dd36f', '#ffc409', '#eb445a'
          ],
          borderWidth: 0
        }]
      };
    })
  );

  monthlyData$ = this.state$.pipe(
    map(state => {
      // Mock data for trends since we might not have many months
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Income',
            data: [4000, 4200, 4100, 4500, 4300, 4800],
            backgroundColor: 'rgba(45, 211, 111, 0.5)',
            borderRadius: 4
          },
          {
            label: 'Expense',
            data: [3200, 3100, 3500, 3000, 3400, 3200],
            backgroundColor: 'rgba(235, 68, 90, 0.5)',
            borderRadius: 4
          }
        ]
      };
    })
  );

  donutOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: 'rgba(255,255,255,0.7)' }
      }
    }
  };

  barOptions = {
    scales: {
      y: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { display: false } }
    },
    plugins: {
      legend: { labels: { color: 'rgba(255,255,255,0.7)' } }
    }
  };

  ngOnInit() { }
}
