import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard';
import { TransactionsComponent } from './components/transactions/transactions';
import { BudgetComponent } from './components/budget/budget';
import { SettingsComponent } from './components/settings/settings';
import { SavingsComponent } from './components/savings/savings';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'transactions', component: TransactionsComponent },
  { path: 'budget', component: BudgetComponent },
  { path: 'savings', component: SavingsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '' }
];
