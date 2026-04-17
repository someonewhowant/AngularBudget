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
}

export interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  deadline?: string;
}

export interface AppState {
  transactions: Transaction[];
  budgets: Budget[];
  theme: string;
  savingsGoals: SavingsGoal[];
  user: UserProfile;
}

export interface Summary {
  income: number;
  expense: number;
  balance: number;
  profit: number;
}
