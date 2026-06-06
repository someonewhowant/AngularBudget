export interface Transaction {
  id: number;
  vendor: string;
  category: string;
  account: string;
  date: string;
  amount: number | string;
  type: 'income' | 'expense';
}

export interface Budget {
  category: string;
  amount: number;
}

export interface UserProfile {
  name: string;
  balance: number;
  currency?: string;
}

export interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  deadline?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'other';
  initialBalance: number;
}

export interface RecurringTransaction {
  id: number;
  name: string;
  amount: number;
  category: string;
  account: string;
  type: 'income' | 'expense';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  nextDueDate: string;
  isActive: boolean;
}

export interface AppState {
  transactions: Transaction[];
  budgets: Budget[];
  theme: string;
  savingsGoals: SavingsGoal[];
  user: UserProfile;
  accounts?: Account[];
  recurringTransactions?: RecurringTransaction[];
}

export interface Summary {
  income: number;
  expense: number;
  balance: number;
  profit: number;
}
