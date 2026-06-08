import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { SavingsGoal } from '../../models/budget.models';
import { ToastService } from '../../services/toast.service';
import { BaseChartComponent } from '../base-chart/base-chart';

@Component({
  selector: 'app-savings',
  imports: [ReactiveFormsModule, SidebarComponent, BaseChartComponent],
  templateUrl: './savings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavingsComponent {
  store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  savingsGoals = this.store.savingsGoals;
  currencySymbol = this.store.currencySymbol;
  expenseCategories = this.store.expenseCategories;
  accounts = this.store.accountsWithBalance;
  selectedAccountId = signal<string>('');

  // Waterfall Priority Funding properties
  user = this.store.user;
  enableWaterfallFunding = computed(() => this.user()?.enableWaterfallFunding || false);
  waterfallSourceAccountId = computed(() => this.user()?.waterfallSourceAccountId || '');
  sortedGoalsByPriority = computed(() => [...this.savingsGoals()].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)));
  manualWaterfallAmount = signal<number>(0);
  manualWaterfallAccountId = signal<string>('');

  totalEstimatedSurplus = computed(() => {
    const budgets = this.store.budgets();
    const transactions = this.store.currentCycleTransactions();
    const goals = this.savingsGoals();

    const linkedCategories = new Set<string>();
    goals.forEach(g => {
      if (g.linkedBudgetCategories) {
        g.linkedBudgetCategories.forEach(cat => linkedCategories.add(cat));
      }
    });

    return budgets.reduce((total, b) => {
      if (linkedCategories.has(b.category)) return total;
      const spent = transactions
        .filter(t => t.category === b.category && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const left = b.amount - spent;
      return total + (left > 0 ? left : 0);
    }, 0);
  });

  isModalOpen = signal(false);
  editingGoal = signal<SavingsGoal | null>(null);

  // Custom modl signals
  isAddFundsOpen = signal(false);
  activeGoal = signal<SavingsGoal | null>(null);
  fundsAmount = signal<number>(0);

  isAnalyticsOpen = signal(false);
  activeAnalyticsGoal = signal<SavingsGoal | null>(null);
  analyticsData = signal<any>({ labels: [], datasets: [] });
  analyticsMetrics = signal<any>({});

  analyticsChartOptions = {
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#b0b0b0'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#b0b0b0',
          callback: (value: any) => this.currencySymbol() + value.toLocaleString()
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: '#ffffff'
        }
      }
    }
  };

  isConfirmDeleteOpen = signal(false);
  goalToDelete = signal<number | null>(null);

  goalForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    targetAmount: [0, [Validators.required, Validators.min(1)]],
    currentAmount: [0, [Validators.required, Validators.min(0)]],
    category: ['General', Validators.required],
    deadline: [''],
    priority: [1, [Validators.required, Validators.min(1)]]
  });

  isLinkModalOpen = signal(false);
  activeLinkGoal = signal<SavingsGoal | null>(null);
  linkForm: FormGroup = this.fb.group({
    linkedBudgetCategories: [[]]
  });

  toggleModal(goal?: SavingsGoal) {
    this.isModalOpen.update(open => !open);
    if (this.isModalOpen()) {
      if (goal) {
        this.editingGoal.set(goal);
        this.goalForm.patchValue({
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          category: goal.category,
          deadline: goal.deadline || '',
          priority: goal.priority || 1
        });
      } else {
        this.editingGoal.set(null);
        const nextPriority = this.savingsGoals().length > 0
          ? Math.max(...this.savingsGoals().map(g => g.priority || 0)) + 1
          : 1;
        this.goalForm.reset({
          name: '',
          targetAmount: 0,
          currentAmount: 0,
          category: 'General',
          deadline: '',
          priority: nextPriority
        });
      }
    }
  }

  handleGoalSubmit() {
    if (this.goalForm.valid) {
      const goalData = this.goalForm.value;
      const currentEditingGoal = this.editingGoal();
      if (currentEditingGoal) {
        this.store.updateSavingsGoal({ ...currentEditingGoal, ...goalData });
        this.toastService.show('Savings goal updated successfully!', 'success');
      } else {
        this.store.addSavingsGoal(goalData);
        this.toastService.show('Savings goal created successfully!', 'success');
      }
      this.toggleModal();
    }
  }

  confirmDeleteGoal(id: number) {
    this.goalToDelete.set(id);
    this.isConfirmDeleteOpen.set(true);
  }

  closeConfirmDelete() {
    this.isConfirmDeleteOpen.set(false);
    this.goalToDelete.set(null);
  }

  executeDeleteGoal() {
    const id = this.goalToDelete();
    if (id !== null) {
      this.store.deleteSavingsGoal(id);
      this.closeConfirmDelete();
      this.toastService.show('Savings goal deleted successfully!', 'success');
    }
  }

  openAddFunds(goal: SavingsGoal) {
    this.activeGoal.set(goal);
    this.fundsAmount.set(0);
    const accList = this.accounts();
    if (accList && accList.length > 0) {
      this.selectedAccountId.set(accList[0].id);
    } else {
      this.selectedAccountId.set('');
    }
    this.isAddFundsOpen.set(true);
  }

  closeAddFunds() {
    this.isAddFundsOpen.set(false);
    this.activeGoal.set(null);
  }

  submitAddFunds() {
    const goal = this.activeGoal();
    const amount = this.fundsAmount();
    const accountId = this.selectedAccountId();
    if (goal && amount > 0 && accountId) {
      this.store.addToSavingsGoal(goal.id, amount, accountId);
      this.closeAddFunds();
      this.toastService.show(`Successfully added ${this.currencySymbol()}${amount} to ${goal.name}!`, 'success');
    }
  }

  handleFundsInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fundsAmount.set(parseFloat(input.value) || 0);
  }

  openLinkModal(goal: SavingsGoal) {
    this.activeLinkGoal.set(goal);
    this.linkForm.patchValue({
      linkedBudgetCategories: goal.linkedBudgetCategories || []
    });
    this.isLinkModalOpen.set(true);
  }

  closeLinkModal() {
    this.isLinkModalOpen.set(false);
    this.activeLinkGoal.set(null);
  }

  submitLinkModal() {
    const goal = this.activeLinkGoal();
    if (goal) {
      const linkedBudgetCategories = this.linkForm.value.linkedBudgetCategories || [];
      this.store.updateSavingsGoal({ ...goal, linkedBudgetCategories });
      this.closeLinkModal();
      this.toastService.show('Auto-fund rules updated successfully!', 'success');
    }
  }

  toggleWaterfallFunding() {
    const current = this.enableWaterfallFunding();
    this.store.updateProfile({ enableWaterfallFunding: !current });
    this.toastService.show(
      !current ? 'Waterfall Priority Funding enabled!' : 'Waterfall Priority Funding disabled.',
      'success'
    );
  }

  setWaterfallSourceAccount(accountId: string) {
    this.store.updateProfile({ waterfallSourceAccountId: accountId });
    this.toastService.show('Waterfall source account updated.', 'success');
  }

  handleManualWaterfallAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.manualWaterfallAmount.set(parseFloat(input.value) || 0);
  }

  distributeWaterfallManually() {
    const amount = this.manualWaterfallAmount();
    const accountId = this.manualWaterfallAccountId() || this.waterfallSourceAccountId() || (this.accounts().length > 0 ? this.accounts()[0].id : '');
    if (amount <= 0) {
      this.toastService.show('Please enter a valid positive amount.', 'error');
      return;
    }
    if (!accountId) {
      this.toastService.show('Please select a source account.', 'error');
      return;
    }
    this.store.distributeWaterfallManual(amount, accountId);
    this.manualWaterfallAmount.set(0);
    this.toastService.show(`Successfully distributed ${this.currencySymbol()}${amount} via priority waterfall!`, 'success');
  }

  getProgress(goal: SavingsGoal): number {
    return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  }

  getGoalDeadlineInfo(goal: SavingsGoal) {
    if (!goal.deadline) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(goal.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (goal.currentAmount >= goal.targetAmount) {
      return { status: 'completed', text: 'Goal achieved! 🎉', alert: false, monthlyRate: 0, weeklyRate: 0 };
    }
    
    if (daysDiff < 0) {
      return { status: 'overdue', text: 'Deadline passed', alert: true, monthlyRate: 0, weeklyRate: 0 };
    }
    
    if (daysDiff === 0) {
      return { status: 'due-today', text: 'Due today! ⚠️', alert: true, monthlyRate: 0, weeklyRate: 0 };
    }
    
    const needed = goal.targetAmount - goal.currentAmount;
    const monthsRemaining = daysDiff / 30.436875;
    const weeksRemaining = daysDiff / 7;
    
    const monthlyRate = monthsRemaining > 0 ? needed / monthsRemaining : needed;
    const weeklyRate = weeksRemaining > 0 ? needed / weeksRemaining : needed;
    
    let timeText = '';
    if (daysDiff > 30) {
      const months = Math.floor(daysDiff / 30.436875);
      const remainingDays = Math.round(daysDiff % 30.436875);
      if (months > 0) {
        timeText = `${months}m ${remainingDays}d left`;
      } else {
        timeText = `${daysDiff} days left`;
      }
    } else {
      timeText = `${daysDiff} days left`;
    }
    
    return {
      status: 'active',
      text: timeText,
      monthlyRate,
      weeklyRate,
      daysLeft: daysDiff,
      alert: daysDiff <= 14
    };
  }

  openAnalytics(goal: SavingsGoal) {
    this.activeAnalyticsGoal.set(goal);
    
    // Calculate Analytics Data
    const data = this.getAnalyticsData(goal);
    this.analyticsData.set(data.chart);
    this.analyticsMetrics.set(data.metrics);
    
    this.isAnalyticsOpen.set(true);
  }

  closeAnalytics() {
    this.isAnalyticsOpen.set(false);
    this.activeAnalyticsGoal.set(null);
  }

  getAnalyticsData(goal: SavingsGoal) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const startStr = goal.createdAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate = new Date(startStr);
    
    const deadlineStr = goal.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const deadlineDate = new Date(deadlineStr);
    
    const txs = this.store.transactions().filter(t => 
      t.vendor === `Savings: ${goal.name}` && t.type === 'expense'
    );
    
    const sortedTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const txTotal = sortedTxs.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const initialAmount = Math.max(0, goal.currentAmount - txTotal);
    
    const elapsedMs = today.getTime() - startDate.getTime();
    const daysElapsed = Math.max(1, Math.round(elapsedMs / (24 * 60 * 60 * 1000)));
    
    const amountSaved = goal.currentAmount - initialAmount;
    const dailyVelocity = amountSaved / daysElapsed;
    const monthlyVelocity = dailyVelocity * 30.4;
    
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    
    let estCompletionText = 'N/A';
    let estCompletionDate: Date | null = null;
    let status = 'Saving';
    let statusColor = 'var(--primary-blue)';
    
    if (remaining <= 0) {
      estCompletionText = 'Goal Completed!';
      status = 'Completed';
      statusColor = '#4eff8a';
    } else if (dailyVelocity <= 0) {
      estCompletionText = 'No active savings history';
      status = 'Needs funding';
      statusColor = '#ffb04e';
    } else {
      const daysToTarget = remaining / dailyVelocity;
      estCompletionDate = new Date(today.getTime() + daysToTarget * 24 * 60 * 60 * 1000);
      estCompletionText = estCompletionDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      
      if (goal.deadline) {
        if (estCompletionDate.getTime() <= deadlineDate.getTime()) {
          status = 'On Track';
          statusColor = '#4eff8a';
        } else {
          status = 'Behind Schedule';
          statusColor = '#ff4d4d';
        }
      }
    }

    const points: { date: Date; actual: number; ideal: number }[] = [];
    
    const totalTime = deadlineDate.getTime() - startDate.getTime();
    const targetToSave = goal.targetAmount - initialAmount;
    const idealRate = totalTime > 0 ? targetToSave / totalTime : 0;
    
    const getIdealVal = (d: Date) => {
      const elapsed = d.getTime() - startDate.getTime();
      return Math.min(goal.targetAmount, initialAmount + Math.max(0, elapsed * idealRate));
    };
    
    points.push({ date: startDate, actual: initialAmount, ideal: initialAmount });
    
    let currentActual = initialAmount;
    sortedTxs.forEach(tx => {
      const txDate = new Date(tx.date);
      currentActual += parseFloat(tx.amount.toString());
      points.push({
        date: txDate,
        actual: currentActual,
        ideal: getIdealVal(txDate)
      });
    });
    
    if (today.getTime() > startDate.getTime()) {
      points.push({
        date: today,
        actual: goal.currentAmount,
        ideal: getIdealVal(today)
      });
    }
    
    points.push({
      date: deadlineDate,
      actual: goal.currentAmount,
      ideal: goal.targetAmount
    });
    
    points.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const uniquePoints: typeof points = [];
    const seenDates = new Set<string>();
    points.forEach(p => {
      const dStr = p.date.toISOString().split('T')[0];
      if (!seenDates.has(dStr)) {
        seenDates.add(dStr);
        uniquePoints.push(p);
      } else {
        const idx = uniquePoints.findIndex(up => up.date.toISOString().split('T')[0] === dStr);
        if (idx !== -1) {
          uniquePoints[idx] = p;
        }
      }
    });

    const labels = uniquePoints.map(p => p.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const actualData = uniquePoints.map(p => p.date.getTime() <= today.getTime() ? Math.round(p.actual) : null);
    const idealData = uniquePoints.map(p => Math.round(p.ideal));
    
    return {
      chart: {
        labels,
        datasets: [
          {
            label: 'Actual Saved',
            data: actualData,
            borderColor: '#4eff8a',
            backgroundColor: 'rgba(78, 255, 138, 0.1)',
            fill: true,
            tension: 0.1
          },
          {
            label: 'Ideal Trajectory',
            data: idealData,
            borderColor: '#4da6ff',
            borderDash: [5, 5],
            fill: false,
            tension: 0
          }
        ]
      },
      metrics: {
        monthlyVelocity: Math.round(monthlyVelocity),
        estCompletionText,
        status,
        statusColor,
        remaining,
        daysElapsed,
        initialAmount
      }
    };
  }
}
