import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, map } from 'rxjs';
import { AppState, Transaction, Budget, UserProfile, Summary, SavingsGoal } from '../models/budget.models';

const INITIAL_BUDGETS: Budget[] = [
  { category: 'Food', amount: 500 },
  { category: 'Housing', amount: 1500 },
  { category: 'Entertainment', amount: 200 },
  { category: 'Electronics', amount: 300 },
  { category: 'Groceries', amount: 400 }
];

const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [
  { id: 1, name: 'New Car', targetAmount: 25000, currentAmount: 5000, category: 'Transport' },
  { id: 2, name: 'Emergency Fund', targetAmount: 10000, currentAmount: 3000, category: 'Security' }
];

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private state$: BehaviorSubject<AppState>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.state$ = new BehaviorSubject<AppState>(this.loadInitialState());

    if (isPlatformBrowser(this.platformId)) {
      this.state$.subscribe(state => {
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('budgets', JSON.stringify(state.budgets));
        localStorage.setItem('savingsGoals', JSON.stringify(state.savingsGoals));
        localStorage.setItem('theme', state.theme);
        this.applyTheme(state.theme);
      });
      // Apply initial theme
      this.applyTheme(this.state$.value.theme);
    }
  }

  private loadInitialState(): AppState {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (isBrowser) {
      try {
        return {
          transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
          budgets: JSON.parse(localStorage.getItem('budgets') || JSON.stringify(INITIAL_BUDGETS)),
          savingsGoals: JSON.parse(localStorage.getItem('savingsGoals') || JSON.stringify(INITIAL_SAVINGS_GOALS)),
          theme: localStorage.getItem('theme') || 'dark',
          user: {
            name: 'User',
            balance: 24500
          }
        };
      } catch (e) {
        console.error('Error loading state from localStorage', e);
      }
    }

    return {
      transactions: [],
      budgets: INITIAL_BUDGETS,
      savingsGoals: INITIAL_SAVINGS_GOALS,
      theme: 'dark',
      user: { name: 'User', balance: 24500 }
    };
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

  // Savings Goals Management
  addSavingsGoal(goal: Omit<SavingsGoal, 'id'>) {
    const id = Date.now();
    const savingsGoals = [...this.state$.value.savingsGoals, { ...goal, id }];
    this.updateState({ savingsGoals });
  }

  updateSavingsGoal(goal: SavingsGoal) {
    const savingsGoals = this.state$.value.savingsGoals.map(g => g.id === goal.id ? goal : g);
    this.updateState({ savingsGoals });
  }

  deleteSavingsGoal(id: number) {
    const savingsGoals = this.state$.value.savingsGoals.filter(g => g.id !== id);
    this.updateState({ savingsGoals });
  }

  addToSavingsGoal(id: number, amount: number) {
    const savingsGoals = this.state$.value.savingsGoals.map(g => {
      if (g.id === id) {
        return { ...g, currentAmount: g.currentAmount + amount };
      }
      return g;
    });
    this.updateState({ savingsGoals });
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

  private calculateSummary(state: AppState): Summary {
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

  getSummary$() {
    return this.state$.pipe(
      map(state => this.calculateSummary(state))
    );
  }

  getSummary() {
    return this.calculateSummary(this.state$.value);
  }
}
