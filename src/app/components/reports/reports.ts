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
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
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
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent
  ],
  template: `
    <div class="ion-page">
      <ion-header [translucent]="true">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-menu-button></ion-menu-button>
          </ion-buttons>
          <ion-title>Reports</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content [fullscreen]="true">
        <div class="main-content" style="padding: 20px;">
          <header class="section-title" style="margin-bottom: 30px;">
            <h1 style="font-size: 2.5rem; font-weight: 700;">Financial Reports</h1>
            <p style="color: var(--text-dim);">Detailed breakdown of your spending habits.</p>
          </header>

          <ion-grid>
            <ion-row>
              <ion-col size="12" size-lg="6">
                <div class="glass-card">
                  <h3>Spending by Category</h3>
                  <app-base-chart type="doughnut" [data]="categoryData$ | async" [options]="donutOptions"></app-base-chart>
                </div>
              </ion-col>
              <ion-col size="12" size-lg="6">
                <div class="glass-card">
                  <h3>Monthly Trend</h3>
                  <app-base-chart type="bar" [data]="monthlyData$ | async" [options]="barOptions"></app-base-chart>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
        </div>
      </ion-content>
    </div>
  `,
  styles: [`
    h3 { margin-bottom: 20px; color: var(--text-main); }
    .glass-card { height: 100%; }
  `]
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

  ngOnInit() {}
}
