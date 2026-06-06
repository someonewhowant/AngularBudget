import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent) },
  { path: 'transactions', loadComponent: () => import('./components/transactions/transactions').then(m => m.TransactionsComponent) },
  { path: 'budget', loadComponent: () => import('./components/budget/budget').then(m => m.BudgetComponent) },
  { path: 'savings', loadComponent: () => import('./components/savings/savings').then(m => m.SavingsComponent) },
  { path: 'settings', loadComponent: () => import('./components/settings/settings').then(m => m.SettingsComponent) },
  { path: 'reports', loadComponent: () => import('./components/reports/reports').then(m => m.ReportsComponent) },
  { path: 'accounts', loadComponent: () => import('./components/accounts/accounts').then(m => m.AccountsComponent) },
  { path: 'subscriptions', loadComponent: () => import('./components/subscriptions/subscriptions').then(m => m.SubscriptionsComponent) },
  { path: '**', redirectTo: '' }
];
