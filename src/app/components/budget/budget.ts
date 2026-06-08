import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { BaseChartComponent } from '../base-chart/base-chart';
import { ToastService } from '../../services/toast.service';
import { SavingsGoal } from '../../models/budget.models';

@Component({
  selector: 'app-budget',
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, BaseChartComponent],
  templateUrl: './budget.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetComponent {
  readonly store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  readonly Math = Math;

  budgets = this.store.budgets;
  summary = this.store.summary;
  currencySymbol = this.store.currencySymbol;
  savingsGoals = this.store.savingsGoals;

  // Goals management signals
  isGoalModalOpen = signal(false);
  editingGoal = signal<SavingsGoal | null>(null);

  isAddFundsOpen = signal(false);
  activeGoal = signal<SavingsGoal | null>(null);
  fundsAmount = signal<number>(0);

  isConfirmDeleteOpen = signal(false);
  goalToDelete = signal<number | null>(null);

  goalForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    targetAmount: [0, [Validators.required, Validators.min(1)]],
    currentAmount: [0, [Validators.required, Validators.min(0)]],
    category: ['General', Validators.required],
    deadline: ['']
  });

  toggleGoalModal(goal?: SavingsGoal) {
    this.isGoalModalOpen.update(open => !open);
    if (this.isGoalModalOpen()) {
      if (goal) {
        this.editingGoal.set(goal);
        this.goalForm.patchValue({
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          category: goal.category,
          deadline: goal.deadline || ''
        });
      } else {
        this.editingGoal.set(null);
        this.goalForm.reset({
          name: '',
          targetAmount: 0,
          currentAmount: 0,
          category: 'General',
          deadline: ''
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
      this.toggleGoalModal();
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
    this.isAddFundsOpen.set(true);
  }

  closeAddFunds() {
    this.isAddFundsOpen.set(false);
    this.activeGoal.set(null);
  }

  submitAddFunds() {
    const goal = this.activeGoal();
    const amount = this.fundsAmount();
    if (goal && amount > 0) {
      this.store.addToSavingsGoal(goal.id, amount);
      this.closeAddFunds();
      this.toastService.show(`Successfully added ${this.currencySymbol()}${amount} to ${goal.name}!`, 'success');
    }
  }

  handleFundsInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fundsAmount.set(parseFloat(input.value) || 0);
  }

  getProgress(goal: SavingsGoal): number {
    return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  }

  expandedParents = signal<Record<string, boolean>>({});

  toggleParent(category: string) {
    this.expandedParents.update(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }

  budgetData = computed(() => {
    const budgets = this.store.budgets();
    const transactions = this.store.currentCycleTransactions();
    const rollovers = this.store.budgetRollovers();
    const user = this.store.user();
    const threshold = user?.budgetWarningThreshold !== undefined ? user.budgetWarningThreshold : 85;
    const enableWarning = user?.enableBudgetWarningAlert !== false;
    const enableOverrun = user?.enableBudgetOverrunAlert !== false;

    return budgets.map(b => {
      const spent = transactions
        .filter(t => t.category === b.category && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      const rollover = rollovers[b.category] || 0;
      const limit = Math.max(b.amount + rollover, 0);
      const percent = limit > 0 ? (spent / limit) * 100 : (spent > 0 ? 100 : 0);
      const progressPercent = Math.min(percent, 100);
      const isNearLimit = enableWarning && percent >= threshold && percent < 100;
      const isOver = enableOverrun && percent >= 100;
      
      return { 
        ...b, 
        spent, 
        percent, 
        progressPercent, 
        isNearLimit, 
        isOver, 
        threshold, 
        rollover, 
        limit 
      };
    });
  });

  groupedBudgets = computed(() => {
    const flatBudgets = this.budgetData();
    const relations = this.store.categoryRelations();

    const budgetMap = new Map<string, typeof flatBudgets[0]>();
    flatBudgets.forEach(b => {
      budgetMap.set(b.category, b);
    });

    const parentCategories = new Set<string>();
    Object.values(relations).forEach(parentName => {
      parentCategories.add(parentName);
    });

    const parents: Array<{
      category: string;
      amount: number;
      spent: number;
      limit: number;
      rollover: number;
      percent: number;
      progressPercent: number;
      isNearLimit: boolean;
      isOver: boolean;
      threshold: number;
      subCategories: Array<typeof flatBudgets[0]>;
      hasSubCategories: boolean;
      isOwnStandaloneVisible: boolean;
      ownStandalone?: typeof flatBudgets[0];
    }> = [];

    const standalones: Array<typeof flatBudgets[0]> = [];
    const handledSubCategories = new Set<string>();

    parentCategories.forEach(parentName => {
      let parentBudget = budgetMap.get(parentName);
      if (!parentBudget) {
        parentBudget = {
          category: parentName,
          amount: 0,
          spent: 0,
          percent: 0,
          progressPercent: 0,
          isNearLimit: false,
          isOver: false,
          threshold: 85,
          rollover: 0,
          limit: 0
        };
      }

      const subs: Array<typeof flatBudgets[0]> = [];
      Object.entries(relations).forEach(([subName, pName]) => {
        if (pName === parentName) {
          let subBudget = budgetMap.get(subName);
          if (!subBudget) {
            subBudget = {
              category: subName,
              amount: 0,
              spent: 0,
              percent: 0,
              progressPercent: 0,
              isNearLimit: false,
              isOver: false,
              threshold: 85,
              rollover: 0,
              limit: 0
            };
          }
          subs.push(subBudget);
          handledSubCategories.add(subName);
        }
      });

      const ownAmount = parentBudget.amount;
      const ownSpent = parentBudget.spent;
      const ownLimit = parentBudget.limit;
      const ownRollover = parentBudget.rollover;

      const totalAmount = ownAmount + subs.reduce((sum, s) => sum + s.amount, 0);
      const totalSpent = ownSpent + subs.reduce((sum, s) => sum + s.spent, 0);
      const totalLimit = ownLimit + subs.reduce((sum, s) => sum + s.limit, 0);
      const totalRollover = ownRollover + subs.reduce((sum, s) => sum + s.rollover, 0);

      const percent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : (totalSpent > 0 ? 100 : 0);
      const progressPercent = Math.min(percent, 100);

      const threshold = parentBudget.threshold;
      const user = this.store.user();
      const enableWarning = user?.enableBudgetWarningAlert !== false;
      const enableOverrun = user?.enableBudgetOverrunAlert !== false;
      const isNearLimit = enableWarning && percent >= threshold && percent < 100;
      const isOver = enableOverrun && percent >= 100;

      parents.push({
        category: parentName,
        amount: totalAmount,
        spent: totalSpent,
        limit: totalLimit,
        rollover: totalRollover,
        percent,
        progressPercent,
        isNearLimit,
        isOver,
        threshold,
        subCategories: subs,
        hasSubCategories: subs.length > 0,
        isOwnStandaloneVisible: ownAmount > 0 || ownSpent > 0,
        ownStandalone: parentBudget
      });
    });

    flatBudgets.forEach(b => {
      if (!parentCategories.has(b.category) && !handledSubCategories.has(b.category)) {
        standalones.push(b);
      }
    });

    return { parents, standalones };
  });

  savingsInfo = computed(() => {
    const summary = this.store.summary();
    const goals = this.store.savingsGoals();

    const currentBalance = summary.balance;
    const totalGoal = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const progressPercent = totalGoal > 0 ? Math.min(Math.round((currentBalance / totalGoal) * 100), 100) : 0;
    const remaining = Math.max(totalGoal - currentBalance, 0);
    return { currentBalance, totalGoal, progressPercent, remaining };
  });

  chartData = computed(() => {
    const budgets = this.budgetData();
    return {
      labels: budgets.map(b => b.category),
      datasets: [
        {
          label: 'Budget',
          data: budgets.map(b => b.amount),
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 4
        },
        {
          label: 'Spent',
          data: budgets.map(b => b.spent),
          backgroundColor: '#bc13fe',
          borderRadius: 4
        }
      ]
    };
  });

  expenseCategories = this.store.expenseCategories;

  isModalOpen = signal(false);
  
  budgetForm: FormGroup = this.fb.group({
    category: [this.expenseCategories()[0] || 'Food', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]]
  });

  getSuggestedBudget(): number {
    const category = this.budgetForm.get('category')?.value;
    if (!category) return 0;
    return this.store.getAverageSpending(category);
  }

  applySuggestedBudget() {
    const suggested = this.getSuggestedBudget();
    if (suggested > 0) {
      this.budgetForm.patchValue({ amount: suggested });
      this.toastService.show(
        this.store.t().settingsTitle === 'Settings' 
          ? `Applied auto-suggested limit of ${this.currencySymbol()}${suggested} based on 3-month history.` 
          : `Применен рекомендованный лимит ${this.currencySymbol()}${suggested} на основе истории за 3 месяца.`,
        'success'
      );
    }
  }

  toggleModal() {
    this.isModalOpen.update(open => !open);
    if (!this.isModalOpen()) {
      this.budgetForm.reset({
        category: this.expenseCategories()[0] || 'Food',
        amount: 0
      });
    }
  }

  handleBudgetSubmit() {
    if (this.budgetForm.valid) {
      const { category, amount } = this.budgetForm.value;
      this.store.setBudget(category, amount);
      this.toggleModal();
      this.toastService.show(`Budget for ${category} updated successfully!`, 'success');
    }
  }
}
