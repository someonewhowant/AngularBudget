import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppState, Transaction, Budget, UserProfile, Summary, SavingsGoal, Account, RecurringTransaction, FinancialInsight } from '../models/budget.models';

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

const INITIAL_RECURRING: RecurringTransaction[] = [
  {
    id: 1,
    name: 'Netflix Subscription',
    amount: 15.99,
    category: 'Entertainment',
    account: 'visa-card',
    type: 'expense',
    frequency: 'monthly',
    startDate: '2026-05-01',
    nextDueDate: '2026-07-01',
    isActive: true
  },
  {
    id: 2,
    name: 'Monthly Salary',
    amount: 3200,
    category: 'Salary',
    account: 'direct-deposit',
    type: 'income',
    frequency: 'monthly',
    startDate: '2026-05-01',
    nextDueDate: '2026-07-01',
    isActive: true
  }
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
  readonly recurringTransactions = computed(() => this.stateSignal().recurringTransactions || INITIAL_RECURRING);

  readonly insights = computed<FinancialInsight[]>(() => {
    const list: FinancialInsight[] = [];
    const state = this.stateSignal();
    const transactions = state.transactions;
    const budgets = state.budgets;
    const goals = state.savingsGoals;
    const accounts = this.accountsWithBalance();
    const recurring = state.recurringTransactions || [];
    const symbol = this.currencySymbol();

    const todayStr = new Date().toISOString().split('T')[0];
    const todayParts = todayStr.split('-');
    const currentYearStr = todayParts[0];
    const currentMonthStr = todayParts[1];

    // 1. Filter transactions for the current month
    const thisMonthTxs = transactions.filter(t => {
      if (!t.date) return false;
      const parts = t.date.split('-');
      return parts[0] === currentYearStr && parts[1] === currentMonthStr;
    });

    // 2. Budget Warnings
    const categoryExpenses = thisMonthTxs
      .filter(t => t.type === 'expense')
      .reduce((acc: Record<string, number>, t) => {
        acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount.toString());
        return acc;
      }, {});

    budgets.forEach(b => {
      const spent = categoryExpenses[b.category] || 0;
      const limit = b.amount;
      if (spent >= limit) {
        list.push({
          type: 'warning',
          icon: 'fa-exclamation-triangle',
          title: `Budget Overrun: ${b.category}`,
          message: `You have spent ${symbol}${spent.toFixed(2)} of your ${symbol}${limit.toFixed(2)} budget. You are over by ${symbol}${(spent - limit).toFixed(2)}!`,
          colorClass: 'warning-red'
        });
      } else if (spent >= limit * 0.85) {
        const pct = Math.round((spent / limit) * 100);
        list.push({
          type: 'warning',
          icon: 'fa-exclamation-circle',
          title: `Near Budget Limit: ${b.category}`,
          message: `You have spent ${pct}% (${symbol}${spent.toFixed(2)} / ${symbol}${limit.toFixed(2)}) of your budget. Consider cutting back on ${b.category.toLowerCase()} spending.`,
          colorClass: 'warning-orange'
        });
      }
    });

    // 3. Cash Flow / Burn Rate Warning
    const incomeThisMonth = thisMonthTxs
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const expenseThisMonth = thisMonthTxs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    if (expenseThisMonth > incomeThisMonth && incomeThisMonth > 0) {
      const diff = expenseThisMonth - incomeThisMonth;
      list.push({
        type: 'warning',
        icon: 'fa-chart-line',
        title: 'Negative Net Cash Flow',
        message: `This month's expenses exceed income by ${symbol}${diff.toFixed(2)}. Look for subscriptions or non-essential categories to reduce.`,
        colorClass: 'warning-red'
      });
    } else if (incomeThisMonth > expenseThisMonth && expenseThisMonth > 0) {
      const saved = incomeThisMonth - expenseThisMonth;
      const pct = Math.round((saved / incomeThisMonth) * 100);
      if (pct >= 20) {
        list.push({
          type: 'success',
          icon: 'fa-thumbs-up',
          title: 'Strong Savings Rate',
          message: `Awesome! You have saved ${symbol}${saved.toFixed(2)} (${pct}% of your income) this month. Keep it up!`,
          colorClass: 'success-green'
        });
      }
    }

    // 4. Low Account Balance Alert
    accounts.forEach(acc => {
      const bal = acc.currentBalance;
      if (bal >= 0 && bal < 50) {
        list.push({
          type: 'info',
          icon: 'fa-wallet',
          title: `Low Balance: ${acc.name}`,
          message: `Your balance on "${acc.name}" is only ${symbol}${bal.toFixed(2)}. Make sure you have enough to cover any upcoming bills.`,
          colorClass: 'info-blue'
        });
      } else if (bal < 0) {
        list.push({
          type: 'warning',
          icon: 'fa-credit-card',
          title: `Overdraft Alert: ${acc.name}`,
          message: `Your account "${acc.name}" is overdrawn by ${symbol}${Math.abs(bal).toFixed(2)}! Fees may apply.`,
          colorClass: 'warning-red'
        });
      }
    });

    // 5. Savings Goals Progress
    goals.forEach(g => {
      const pct = Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100);
      if (pct === 100) {
        list.push({
          type: 'success',
          icon: 'fa-trophy',
          title: `Goal Achieved: ${g.name}`,
          message: `Congratulations! You reached 100% of your target for "${g.name}".`,
          colorClass: 'success-green'
        });
      } else if (pct >= 90) {
        list.push({
          type: 'tip',
          icon: 'fa-bullseye',
          title: `Goal Within Reach: ${g.name}`,
          message: `You are only ${100 - pct}% away from your target of ${symbol}${g.targetAmount.toFixed(2)} for "${g.name}"!`,
          colorClass: 'tip-purple'
        });
      }
    });

    // 6. Upcoming Subscriptions/Bills
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    recurring.forEach(rt => {
      if (!rt.isActive) return;
      const due = new Date(rt.nextDueDate);
      due.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 3) {
        const acc = accounts.find(a => a.id === rt.account);
        const accName = acc ? acc.name : rt.account;
        list.push({
          type: 'info',
          icon: 'fa-clock',
          title: `Upcoming Bill: ${rt.name}`,
          message: `Your ${rt.frequency} payment of ${symbol}${rt.amount.toFixed(2)} is due in ${diffDays} day(s) (${rt.nextDueDate}) from account "${accName}".`,
          colorClass: 'info-blue'
        });
      }
    });

    // Default insight if none are triggered
    if (list.length === 0) {
      list.push({
        type: 'info',
        icon: 'fa-robot',
        title: 'All Systems Nominal',
        message: 'Your finances are looking solid! No budget overruns, upcoming bills, or low balances detected. Keep tracking your spending to stay on top.',
        colorClass: 'info-blue'
      });
    }

    return list;
  });

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
      const savedExpense = localStorage.getItem('expenseCategories');
      if (savedExpense) {
        this.expenseCategories.set(JSON.parse(savedExpense));
      }
      const savedIncome = localStorage.getItem('incomeCategories');
      if (savedIncome) {
        this.incomeCategories.set(JSON.parse(savedIncome));
      }

      effect(() => {
        const state = this.stateSignal();
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('budgets', JSON.stringify(state.budgets));
        localStorage.setItem('savingsGoals', JSON.stringify(state.savingsGoals));
        localStorage.setItem('user', JSON.stringify(state.user));
        localStorage.setItem('accounts', JSON.stringify(state.accounts || DEFAULT_ACCOUNTS));
        localStorage.setItem('recurringTransactions', JSON.stringify(state.recurringTransactions || INITIAL_RECURRING));
        localStorage.setItem('theme', state.theme);
        this.applyTheme(state.theme);
      });
      // Apply initial theme
      this.applyTheme(this.stateSignal().theme);
      
      // Automatically process any due recurring payments/income
      setTimeout(() => this.processDueRecurringTransactions(), 0);
    }
  }

  processDueRecurringTransactions() {
    const state = this.stateSignal();
    const recurring = state.recurringTransactions || INITIAL_RECURRING;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let stateUpdated = false;
    let transactions = [...state.transactions];
    const updatedRecurring = recurring.map(rt => {
      if (!rt.isActive) return rt;

      let rtCopy = { ...rt };
      let nextDue = new Date(rtCopy.nextDueDate);
      nextDue.setHours(0, 0, 0, 0);
      
      while (nextDue <= today) {
        // Create new transaction record
        const newTx: Transaction = {
          id: Date.now() + Math.random(),
          vendor: rtCopy.name,
          category: rtCopy.category,
          account: rtCopy.account,
          date: rtCopy.nextDueDate,
          amount: rtCopy.amount,
          type: rtCopy.type
        };
        transactions = [newTx, ...transactions];
        stateUpdated = true;

        // Calculate next due date based on frequency
        if (rtCopy.frequency === 'daily') {
          nextDue.setDate(nextDue.getDate() + 1);
        } else if (rtCopy.frequency === 'weekly') {
          nextDue.setDate(nextDue.getDate() + 7);
        } else if (rtCopy.frequency === 'monthly') {
          nextDue.setMonth(nextDue.getMonth() + 1);
        } else if (rtCopy.frequency === 'yearly') {
          nextDue.setFullYear(nextDue.getFullYear() + 1);
        }
        rtCopy.nextDueDate = nextDue.toISOString().split('T')[0];
      }

      return rtCopy;
    });

    if (stateUpdated) {
      this.updateState({
        transactions,
        recurringTransactions: updatedRecurring
      });
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
          accounts: JSON.parse(localStorage.getItem('accounts') || JSON.stringify(DEFAULT_ACCOUNTS)),
          recurringTransactions: JSON.parse(localStorage.getItem('recurringTransactions') || JSON.stringify(INITIAL_RECURRING))
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
      accounts: DEFAULT_ACCOUNTS,
      recurringTransactions: INITIAL_RECURRING
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

  updateTransaction(updatedTransaction: Transaction) {
    const transactions = this.stateSignal().transactions.map(t => 
      t.id === updatedTransaction.id ? updatedTransaction : t
    );
    this.updateState({ transactions });
  }

  deleteTransaction(id: number) {
    const transactions = this.stateSignal().transactions.filter(t => t.id !== id);
    this.updateState({ transactions });
  }

  // Recurring Transactions Management
  addRecurringTransaction(rt: Omit<RecurringTransaction, 'id'>) {
    const id = Date.now();
    const recurringTransactions = [...(this.stateSignal().recurringTransactions || INITIAL_RECURRING), { ...rt, id }];
    this.updateState({ recurringTransactions });
    // Process immediately in case the start date is in the past
    this.processDueRecurringTransactions();
  }

  updateRecurringTransaction(rt: RecurringTransaction) {
    const recurringTransactions = (this.stateSignal().recurringTransactions || INITIAL_RECURRING).map(item => 
      item.id === rt.id ? rt : item
    );
    this.updateState({ recurringTransactions });
    this.processDueRecurringTransactions();
  }

  deleteRecurringTransaction(id: number) {
    const recurringTransactions = (this.stateSignal().recurringTransactions || INITIAL_RECURRING).filter(item => 
      item.id !== id
    );
    this.updateState({ recurringTransactions });
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

  // Categories Management
  addExpenseCategory(category: string) {
    const trimmed = category.trim();
    if (trimmed && !this.expenseCategories().includes(trimmed)) {
      this.expenseCategories.update(cats => [...cats, trimmed]);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('expenseCategories', JSON.stringify(this.expenseCategories()));
      }
    }
  }

  deleteExpenseCategory(category: string) {
    this.expenseCategories.update(cats => cats.filter(c => c !== category));
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('expenseCategories', JSON.stringify(this.expenseCategories()));
    }
  }

  addIncomeCategory(category: string) {
    const trimmed = category.trim();
    if (trimmed && !this.incomeCategories().includes(trimmed)) {
      this.incomeCategories.update(cats => [...cats, trimmed]);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('incomeCategories', JSON.stringify(this.incomeCategories()));
      }
    }
  }

  deleteIncomeCategory(category: string) {
    this.incomeCategories.update(cats => cats.filter(c => c !== category));
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('incomeCategories', JSON.stringify(this.incomeCategories()));
    }
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
