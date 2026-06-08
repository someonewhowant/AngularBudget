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
      vendor: 'Supermarket',
      category: 'Food',
      amount: 350,
      type: 'expense',
      date: '2026-05-15T10:00:00Z'
    });

    // Add transaction in current cycle (June 10) - should NOT affect rollover
    service.addTransaction({
      id: 2,
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
      vendor: 'Cinema',
      category: 'Entertainment',
      amount: 120,
      type: 'expense',
      date: '2026-05-10T10:00:00Z'
    });
    service.addTransaction({
      id: 4,
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
      vendor: 'Supermarket 1',
      category: 'Food',
      amount: 300,
      type: 'expense',
      date: '2026-05-10T10:00:00Z'
    });
    service.addTransaction({
      id: 2,
      vendor: 'Supermarket 2',
      category: 'Food',
      amount: 150,
      type: 'expense',
      date: '2026-04-15T10:00:00Z'
    });
    service.addTransaction({
      id: 3,
      vendor: 'Supermarket 3',
      category: 'Food',
      amount: 150,
      type: 'expense',
      date: '2026-03-20T10:00:00Z'
    });

    // Add a transaction outside the range (too old: Feb 20) - should be ignored
    service.addTransaction({
      id: 4,
      vendor: 'Supermarket Old',
      category: 'Food',
      amount: 500,
      type: 'expense',
      date: '2026-02-20T10:00:00Z'
    });

    // Add a transaction in the current cycle (June 10) - should be ignored
    service.addTransaction({
      id: 5,
      vendor: 'Supermarket Current',
      category: 'Food',
      amount: 200,
      type: 'expense',
      date: '2026-06-10T10:00:00Z'
    });

    // Add an income transaction in Food (should be ignored)
    service.addTransaction({
      id: 6,
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
