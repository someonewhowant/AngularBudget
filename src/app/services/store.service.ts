import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, map } from 'rxjs';
import { AppState, Transaction, Budget, UserProfile, Summary } from '../models/budget.models';

const INITIAL_BUDGETS: Budget[] = [
  { category: 'Food', amount: 500 },
  { category: 'Housing', amount: 1500 },
  { category: 'Entertainment', amount: 200 },
  { category: 'Electronics', amount: 300 },
  { category: 'Groceries', amount: 400 }
];

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private state$ = new BehaviorSubject<AppState>(this.loadInitialState());

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.state$.subscribe(state => {
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('budgets', JSON.stringify(state.budgets));
        localStorage.setItem('theme', state.theme);
        localStorage.setItem('savingsGoal', state.savingsGoal.toString());
        this.applyTheme(state.theme);
      });
      // Apply initial theme
      this.applyTheme(this.state$.value.theme);
    }
  }

  private loadInitialState(): AppState {
    if (isPlatformBrowser(this.platformId)) {
      return {
        transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
        budgets: JSON.parse(localStorage.getItem('budgets') || JSON.stringify(INITIAL_BUDGETS)),
        theme: localStorage.getItem('theme') || 'dark',
        savingsGoal: parseFloat(localStorage.getItem('savingsGoal') || '50000'),
        user: {
          name: 'User',
          balance: 24500
        }
      };
    } else {
      return {
        transactions: [],
        budgets: INITIAL_BUDGETS,
        theme: 'dark',
        savingsGoal: 50000,
        user: { name: 'User', balance: 24500 }
      };
    }
  }

  getState() {
    return this.state$.asObservable();
  }

  getCurrentState() {
    return this.state$.value;
  }

  private applyTheme(theme: string) {
    if (isPlatformBrowser(this.platformId)) {
      document.body.className = `theme-${theme}`;
    }
  }

  setTheme(theme: string) {
    this.updateState({ theme });
  }

  setSavingsGoal(amount: number) {
    this.updateState({ savingsGoal: amount });
  }

  addTransaction(transaction: Transaction) {
    const transactions = [transaction, ...this.state$.value.transactions];
    this.updateState({ transactions });
  }

  deleteTransaction(id: number) {
    const transactions = this.state$.value.transactions.filter(t => t.id !== id);
    this.updateState({ transactions });
  }

  setBudget(category: string, amount: number) {
    const budgets = [...this.state$.value.budgets];
    const index = budgets.findIndex(b => b.category === category);
    if (index > -1) {
      budgets[index] = { category, amount };
    } else {
      budgets.push({ category, amount });
    }
    this.updateState({ budgets });
  }

  updateProfile(userData: Partial<UserProfile>) {
    this.updateState({
      user: { ...this.state$.value.user, ...userData }
    });
  }

  resetData() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
      location.reload();
    }
  }

  private updateState(newState: Partial<AppState>) {
    this.state$.next({ ...this.state$.value, ...newState });
  }

  getSummary$() {
    return this.state$.pipe(
      map(state => {
        const transactions = state.transactions;
        const income = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        const expense = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
        return {
          income,
          expense,
          balance: state.user.balance + income - expense,
          profit: income - expense
        };
      })
    );
  }

  getSummary() {
    const state = this.state$.value;
    const transactions = state.transactions;
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    
    return {
      income,
      expense,
      balance: state.user.balance + income - expense,
      profit: income - expense
    };
  }
}
