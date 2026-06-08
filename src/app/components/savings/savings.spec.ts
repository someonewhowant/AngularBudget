// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { SavingsComponent } from './savings';
import { StoreService } from '../../services/store.service';
import { SavingsGoal, Transaction } from '../../models/budget.models';
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

describe('SavingsComponent - Trajectory Charts & Projection Analytics', () => {
  let component: SavingsComponent;
  let store: StoreService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    
    // Lock system time to a fixed date: June 15, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }

    TestBed.configureTestingModule({
      providers: [StoreService, SavingsComponent]
    });
    TestBed.overrideComponent(SavingsComponent, {
      set: {
        template: '<div></div>',
        imports: []
      }
    });
    
    store = TestBed.inject(StoreService);
    component = TestBed.inject(SavingsComponent);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with analytics closed', () => {
    expect(component.isAnalyticsOpen()).toBe(false);
    expect(component.activeAnalyticsGoal()).toBeNull();
  });

  it('should open and close analytics modal with correct signals set', () => {
    const mockGoal: SavingsGoal = {
      id: 12345,
      name: 'New Car',
      targetAmount: 10000,
      currentAmount: 1000,
      category: 'Vehicle',
      createdAt: '2026-05-16',
      deadline: '2026-12-16'
    };

    component.openAnalytics(mockGoal);
    expect(component.isAnalyticsOpen()).toBe(true);
    expect(component.activeAnalyticsGoal()).toEqual(mockGoal);

    component.closeAnalytics();
    expect(component.isAnalyticsOpen()).toBe(false);
    expect(component.activeAnalyticsGoal()).toBeNull();
  });

  it('should compute correct projection metrics with no savings transactions', () => {
    const mockGoal: SavingsGoal = {
      id: 12345,
      name: 'Vacation',
      targetAmount: 5000,
      currentAmount: 1000, // starting initial amount
      category: 'Travel',
      createdAt: '2026-05-16',
      deadline: '2026-08-16'
    };

    const data = component.getAnalyticsData(mockGoal);

    // No transactions -> initialAmount = currentAmount = 1000
    expect(data.metrics.initialAmount).toBe(1000);
    expect(data.metrics.remaining).toBe(4000);
    expect(data.metrics.monthlyVelocity).toBe(0);
    expect(data.metrics.status).toBe('Needs funding');
    expect(data.metrics.estCompletionText).toBe('No active savings history');
  });

  it('should compute correct velocity and est completion with active transactions', () => {
    const mockGoal: SavingsGoal = {
      id: 12345,
      name: 'House Downpayment',
      targetAmount: 20000,
      currentAmount: 6000,
      category: 'Housing',
      createdAt: '2026-05-16', // 30 days before June 15, 2026
      deadline: '2026-10-16'
    };

    // Add 2 savings transactions for this goal totaling 4000
    // So initialAmount should be 6000 - 4000 = 2000
    const tx1: Transaction = {
      id: 1,
      type: 'expense',
      category: 'Savings',
      amount: 1500,
      date: '2026-05-20',
      vendor: 'Savings: House Downpayment',
      account: 'acc1'
    };

    const tx2: Transaction = {
      id: 2,
      type: 'expense',
      category: 'Savings',
      amount: 2500,
      date: '2026-06-05',
      vendor: 'Savings: House Downpayment',
      account: 'acc1'
    };

    // Populate store's transactions
    store.addTransaction(tx1);
    store.addTransaction(tx2);

    const data = component.getAnalyticsData(mockGoal);

    expect(data.metrics.initialAmount).toBe(2000);
    expect(data.metrics.remaining).toBe(14000);
    
    // Days elapsed from May 16 to June 15 (with timezone offsets/roundings) = 31 days
    // Saved amount = 6000 - 2000 = 4000
    // Daily velocity = 4000 / 31 = 129.032
    // Monthly velocity = 129.032 * 30.4 = 3922.58 (rounded to 3923)
    expect(data.metrics.daysElapsed).toBe(31);
    expect(data.metrics.monthlyVelocity).toBe(3923);
    expect(data.metrics.status).toBe('On Track');
  });
});
