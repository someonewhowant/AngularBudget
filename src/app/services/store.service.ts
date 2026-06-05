import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppState, Transaction, Budget, UserProfile, Summary, SavingsGoal, Account } from '../models/budget.models';

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

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'visa-card', name: 'Visa Card', type: 'credit', initialBalance: 5000 },
  { id: 'cash', name: 'Cash', type: 'cash', initialBalance: 500 },
  { id: 'direct-deposit', name: 'Direct Deposit', type: 'checking', initialBalance: 19000 }
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble (RUB)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge (KZT)' },
  { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble (BYN)' },

];

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private platformId = inject(PLATFORM_ID);

  private stateSignal = signal<AppState>(this.loadInitialState());

  readonly state = this.stateSignal.asReadonly();
  readonly transactions = computed(() => this.stateSignal().transactions);
  readonly budgets = computed(() => this.stateSignal().budgets);
  readonly savingsGoals = computed(() => this.stateSignal().savingsGoals);
  readonly theme = computed(() => this.stateSignal().theme);
  readonly user = computed(() => this.stateSignal().user);
  readonly summary = computed(() => this.calculateSummary(this.stateSignal()));

  readonly expenseCategories = signal<string[]>(['Food', 'Housing', 'Entertainment', 'Electronics', 'Groceries']);
  readonly incomeCategories = signal<string[]>(['Salary', 'Freelance', 'Investments', 'Other']);

  readonly currencies = signal(CURRENCIES);

  readonly currencySymbol = computed(() => {
    const curCode = this.stateSignal().user.currency || 'USD';
    const match = CURRENCIES.find(c => c.code === curCode);
    return match ? match.symbol : '$';
  });

  readonly accounts = computed(() => this.stateSignal().accounts || DEFAULT_ACCOUNTS);

  readonly accountsWithBalance = computed(() => {
    const state = this.stateSignal();
    const accounts = state.accounts || DEFAULT_ACCOUNTS;
    const transactions = state.transactions;

    return accounts.map(acc => {
      const accIncome = transactions
        .filter(t => (t.account === acc.id || t.account === acc.name) && t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const accExpense = transactions
        .filter(t => (t.account === acc.id || t.account === acc.name) && t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      return {
        ...acc,
        currentBalance: acc.initialBalance + accIncome - accExpense
      };
    });
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const state = this.stateSignal();
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('budgets', JSON.stringify(state.budgets));
        localStorage.setItem('savingsGoals', JSON.stringify(state.savingsGoals));
        localStorage.setItem('user', JSON.stringify(state.user));
        localStorage.setItem('accounts', JSON.stringify(state.accounts || DEFAULT_ACCOUNTS));
        localStorage.setItem('theme', state.theme);
        this.applyTheme(state.theme);
      });
      // Apply initial theme
      this.applyTheme(this.stateSignal().theme);
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
          user: JSON.parse(localStorage.getItem('user') || JSON.stringify({
            name: 'User',
            balance: 24500,
            currency: 'USD'
          })),
          accounts: JSON.parse(localStorage.getItem('accounts') || JSON.stringify(DEFAULT_ACCOUNTS))
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
      user: { name: 'User', balance: 24500, currency: 'USD' },
      accounts: DEFAULT_ACCOUNTS
    };
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
    const savingsGoals = [...this.stateSignal().savingsGoals, { ...goal, id }];
    this.updateState({ savingsGoals });
  }

  updateSavingsGoal(goal: SavingsGoal) {
    const savingsGoals = this.stateSignal().savingsGoals.map(g => g.id === goal.id ? goal : g);
    this.updateState({ savingsGoals });
  }

  deleteSavingsGoal(id: number) {
    const savingsGoals = this.stateSignal().savingsGoals.filter(g => g.id !== id);
    this.updateState({ savingsGoals });
  }

  addToSavingsGoal(id: number, amount: number) {
    const savingsGoals = this.stateSignal().savingsGoals.map(g => {
      if (g.id === id) {
        return { ...g, currentAmount: g.currentAmount + amount };
      }
      return g;
    });
    this.updateState({ savingsGoals });
  }

  addTransaction(transaction: Transaction) {
    const transactions = [transaction, ...this.stateSignal().transactions];
    this.updateState({ transactions });
  }

  deleteTransaction(id: number) {
    const transactions = this.stateSignal().transactions.filter(t => t.id !== id);
    this.updateState({ transactions });
  }

  setBudget(category: string, amount: number) {
    const budgets = [...this.stateSignal().budgets];
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
      user: { ...this.stateSignal().user, ...userData }
    });
  }

  resetData() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
      location.reload();
    }
  }

  addAccount(account: Omit<Account, 'id'>) {
    const id = account.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let uniqueId = id;
    let counter = 1;
    const currentAccounts = this.stateSignal().accounts || DEFAULT_ACCOUNTS;
    while (currentAccounts.some(acc => acc.id === uniqueId)) {
      uniqueId = `${id}-${counter++}`;
    }
    const accounts = [...currentAccounts, { ...account, id: uniqueId }];
    this.updateState({ accounts });
  }

  updateAccount(account: Account) {
    const currentAccounts = this.stateSignal().accounts || DEFAULT_ACCOUNTS;
    const accounts = currentAccounts.map(acc => acc.id === account.id ? account : acc);
    this.updateState({ accounts });
  }

  deleteAccount(id: string) {
    const currentAccounts = this.stateSignal().accounts || DEFAULT_ACCOUNTS;
    const accounts = currentAccounts.filter(acc => acc.id !== id);
    const transactions = this.stateSignal().transactions.filter(t => t.account !== id);
    this.updateState({ accounts, transactions });
  }

  private updateState(newState: Partial<AppState>) {
    this.stateSignal.update(state => ({ ...state, ...newState }));
  }

  private calculateSummary(state: AppState): Summary {
    const transactions = state.transactions;
    const accounts = state.accounts || DEFAULT_ACCOUNTS;

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalInitialBalance = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);

    return {
      income,
      expense,
      balance: totalInitialBalance + income - expense,
      profit: income - expense
    };
  }
}
