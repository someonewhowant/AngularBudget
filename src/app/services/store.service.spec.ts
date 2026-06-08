// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { StoreService } from './store.service';
import { Transaction, Budget, UserProfile } from '../models/budget.models';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

const mockStore: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStore[key] || null,
  setItem: (key: string, value: string) => { mockStore[key] = String(value); },
  removeItem: (key: string) => { delete mockStore[key]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); },
  get length() { return Object.keys(mockStore).length; },
  key: (index: number) => Object.keys(mockStore)[index] || null
};

try {
  TestBed.initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting()
  );
} catch (e) {
  // Catch re-initialization exceptions
}

describe('StoreService - Rollover Budgets', () => {
  let service: StoreService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    
    // Lock system time to a fixed date: June 15, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    
    // Clear localStorage to ensure clean state
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }

    TestBed.configureTestingModule({
      providers: [StoreService]
    });
    service = TestBed.inject(StoreService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return empty rollovers when rollover is disabled', () => {
    service.updateProfile({ enableBudgetRollover: false });
    expect(service.budgetRollovers()).toEqual({});
  });

  it('should calculate positive rollover (savings) when spending is below budget limit', () => {
    // Configure user profile and budgets
    service.updateProfile({ 
      enableBudgetRollover: true, 
      budgetStartDay: 1 
    });
    
    service.setBudget('Food', 500);

    // Add transaction in previous cycle (May 15)
    service.addTransaction({
      id: 1,
      account: 'Checking',
      vendor: 'Supermarket',
      category: 'Food',
      amount: 350,
      type: 'expense',
      date: '2026-05-15T10:00:00Z'
    });

    // Add transaction in current cycle (June 10) - should NOT affect rollover
    service.addTransaction({
      id: 2,
      account: 'Checking',
      vendor: 'Restaurant',
      category: 'Food',
      amount: 100,
      type: 'expense',
      date: '2026-06-10T10:00:00Z'
    });

    // Rollover should be 500 - 350 = 150
    const rollovers = service.budgetRollovers();
    expect(rollovers['Food']).toBe(150);
  });

  it('should calculate negative rollover (debt) when spending exceeds budget limit', () => {
    // Configure user profile and budgets
    service.updateProfile({ 
      enableBudgetRollover: true, 
      budgetStartDay: 1 
    });
    
    service.setBudget('Entertainment', 200);

    // Add transactions in previous cycle (May 10 & May 20)
    service.addTransaction({
      id: 3,
      account: 'Checking',
      vendor: 'Cinema',
      category: 'Entertainment',
      amount: 120,
      type: 'expense',
      date: '2026-05-10T10:00:00Z'
    });
    service.addTransaction({
      id: 4,
      account: 'Checking',
      vendor: 'Concert',
      category: 'Entertainment',
      amount: 150,
      type: 'expense',
      date: '2026-05-20T10:00:00Z'
    });

    // Rollover should be 200 - 270 = -70
    const rollovers = service.budgetRollovers();
    expect(rollovers['Entertainment']).toBe(-70);
  });
});

describe('StoreService - Smart Auto-Suggestions', () => {
  let service: StoreService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    
    // Lock system time to a fixed date: June 15, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    
    // Clear localStorage to ensure clean state
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }

    TestBed.configureTestingModule({
      providers: [StoreService]
    });
    service = TestBed.inject(StoreService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 0 when there are no transactions for the category', () => {
    expect(service.getAverageSpending('Food')).toBe(0);
  });

  it('should calculate 3-month average spending correctly (sum / 3) excluding current cycle', () => {
    // Configure user profile to start budget cycle on the 1st
    service.updateProfile({ budgetStartDay: 1 });

    // Add transactions within the 3-month suggestion range (March 1st to June 1st):
    service.addTransaction({
      id: 1,
      account: 'Checking',
      vendor: 'Supermarket 1',
      category: 'Food',
      amount: 300,
      type: 'expense',
      date: '2026-05-10T10:00:00Z'
    });
    service.addTransaction({
      id: 2,
      account: 'Checking',
      vendor: 'Supermarket 2',
      category: 'Food',
      amount: 150,
      type: 'expense',
      date: '2026-04-15T10:00:00Z'
    });
    service.addTransaction({
      id: 3,
      account: 'Checking',
      vendor: 'Supermarket 3',
      category: 'Food',
      amount: 150,
      type: 'expense',
      date: '2026-03-20T10:00:00Z'
    });

    // Add a transaction outside the range (too old: Feb 20) - should be ignored
    service.addTransaction({
      id: 4,
      account: 'Checking',
      vendor: 'Supermarket Old',
      category: 'Food',
      amount: 500,
      type: 'expense',
      date: '2026-02-20T10:00:00Z'
    });

    // Add a transaction in the current cycle (June 10) - should be ignored
    service.addTransaction({
      id: 5,
      account: 'Checking',
      vendor: 'Supermarket Current',
      category: 'Food',
      amount: 200,
      type: 'expense',
      date: '2026-06-10T10:00:00Z'
    });

    // Add an income transaction in Food (should be ignored)
    service.addTransaction({
      id: 6,
      account: 'Checking',
      vendor: 'Refund',
      category: 'Food',
      amount: 100,
      type: 'income',
      date: '2026-05-25T10:00:00Z'
    });

    // Average spending suggestion should be (300 + 150 + 150) / 3 = 200
    expect(service.getAverageSpending('Food')).toBe(200);
  });
});

describe('StoreService - Category Hierarchy & Sub-categories', () => {
  let service: StoreService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [StoreService]
    });
    service = TestBed.inject(StoreService);
  });

  it('should add an expense category with a parentId and populate categories computed property', () => {
    service.addExpenseCategory('Veggies', 'Food');
    expect(service.expenseCategories()).toContain('Veggies');
    expect(service.categoryRelations()['Veggies']).toBe('Food');

    const computedCategories = service.categories();
    const veggies = computedCategories.find(c => c.name === 'Veggies');
    expect(veggies).toBeDefined();
    expect(veggies?.parentId).toBe('Food');
    expect(veggies?.type).toBe('expense');
  });

  it('should add an income category with a parentId and populate categories computed property', () => {
    service.addIncomeCategory('Bonus', 'Salary');
    expect(service.incomeCategories()).toContain('Bonus');
    expect(service.categoryRelations()['Bonus']).toBe('Salary');

    const computedCategories = service.categories();
    const bonus = computedCategories.find(c => c.name === 'Bonus');
    expect(bonus).toBeDefined();
    expect(bonus?.parentId).toBe('Salary');
    expect(bonus?.type).toBe('income');
  });

  it('should update parentId using setCategoryParent', () => {
    service.addExpenseCategory('Dining Out');
    expect(service.categoryRelations()['Dining Out']).toBeUndefined();

    service.setCategoryParent('Dining Out', 'Food');
    expect(service.categoryRelations()['Dining Out']).toBe('Food');

    service.setCategoryParent('Dining Out', undefined);
    expect(service.categoryRelations()['Dining Out']).toBeUndefined();
  });

  it('should clean up categoryRelations when a parent or sub-category is deleted', () => {
    service.addExpenseCategory('SubCategory', 'ParentCategory');
    expect(service.categoryRelations()['SubCategory']).toBe('ParentCategory');

    // Deleting a sub-category should remove its relation entry
    service.deleteExpenseCategory('SubCategory');
    expect(service.categoryRelations()['SubCategory']).toBeUndefined();

    // Deleting a parent category should clean up relations pointing to it
    service.addExpenseCategory('SubCategory2', 'ParentCategory');
    expect(service.categoryRelations()['SubCategory2']).toBe('ParentCategory');

    service.deleteExpenseCategory('ParentCategory');
    expect(service.categoryRelations()['SubCategory2']).toBeUndefined();
  });
});

describe('StoreService - Waterfall Priority Funding', () => {
  let service: StoreService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    
    // Lock system time to a fixed date: June 15, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));

    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [StoreService]
    });
    service = TestBed.inject(StoreService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should manually distribute waterfall funds to goals in priority order', () => {
    // Add mock account and savings goals
    service.updateState({
      accounts: [{ id: 'Checking', name: 'Checking', type: 'checking', balance: 1000 }],
      savingsGoals: [
        { id: 1, name: 'New Car', targetAmount: 500, currentAmount: 100, category: 'Transport', priority: 2 },
        { id: 2, name: 'Emergency Fund', targetAmount: 300, currentAmount: 100, category: 'Security', priority: 1 }
      ]
    });

    service.distributeWaterfallManual(300, 'Checking');

    const goals = service.savingsGoals();
    const emergencyFund = goals.find(g => g.id === 2);
    const newCar = goals.find(g => g.id === 1);

    // Emergency Fund (Priority 1) should get 200 to be fully funded (100 -> 300)
    expect(emergencyFund?.currentAmount).toBe(300);
    // New Car (Priority 2) should get the remaining 100 (100 -> 200)
    expect(newCar?.currentAmount).toBe(200);

    // Verify transactions
    const txs = service.transactions();
    expect(txs.length).toBe(2);
    expect(txs.some(t => t.vendor.includes('Emergency Fund') && t.amount === 200)).toBe(true);
    expect(txs.some(t => t.vendor.includes('New Car') && t.amount === 100)).toBe(true);
  });

  it('should auto-sweep leftover surplus to goals in priority order at end of cycle', () => {
    service.updateProfile({
      enableBudgetRollover: true,
      enableWaterfallFunding: true,
      waterfallSourceAccountId: 'Checking'
    });
    
    // Setup budget and savings goals
    service.updateState({
      budgets: [{ category: 'Food', amount: 500 }],
      accounts: [{ id: 'Checking', name: 'Checking', type: 'checking', balance: 1000 }],
      savingsGoals: [
        { id: 1, name: 'New Car', targetAmount: 500, currentAmount: 100, category: 'Transport', priority: 2 },
        { id: 2, name: 'Emergency Fund', targetAmount: 300, currentAmount: 100, category: 'Security', priority: 1 }
      ]
    });

    // Add transaction in previous cycle (May 15)
    service.addTransaction({
      id: 99,
      account: 'Checking',
      vendor: 'Supermarket',
      category: 'Food',
      amount: 300,
      type: 'expense',
      date: '2026-05-15T10:00:00Z'
    });

    // Run surplus sweeps (May cycle surplus: 500 - 300 = 200)
    service.processSurplusToSavings();

    const goals = service.savingsGoals();
    const emergencyFund = goals.find(g => g.id === 2);
    const newCar = goals.find(g => g.id === 1);

    // Emergency Fund (Priority 1) should get the full 200 (100 -> 300)
    expect(emergencyFund?.currentAmount).toBe(300);
    // New Car (Priority 2) should get 0
    expect(newCar?.currentAmount).toBe(100);

    // Verify sweep transactions
    const txs = service.transactions().filter(t => t.id !== 99);
    expect(txs.length).toBe(1);
    expect(txs[0].amount).toBe(200);
    expect(txs[0].vendor).toContain('Emergency Fund');
  });

  it('should successfully add funds to savings goal using DEFAULT_ACCOUNTS fallback', () => {
    service['updateState']({
      accounts: undefined,
      savingsGoals: [
        { id: 1, name: 'Vacation', targetAmount: 1000, currentAmount: 100, category: 'Travel', priority: 1 }
      ],
      transactions: []
    });

    service.addToSavingsGoal(1, 150, 'cash');

    const goals = service.savingsGoals();
    expect(goals[0].currentAmount).toBe(250);

    const txs = service.transactions();
    expect(txs.length).toBe(1);
    expect(txs[0].amount).toBe(150);
    expect(txs[0].account).toBe('cash');
    expect(txs[0].category).toBe('Savings');
  });
});
