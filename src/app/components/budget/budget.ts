import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { BaseChartComponent } from '../base-chart/base-chart';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-budget',
  imports: [ReactiveFormsModule, SidebarComponent, BaseChartComponent],
  templateUrl: './budget.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetComponent {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  budgets = this.store.budgets;
  summary = this.store.summary;
  currencySymbol = this.store.currencySymbol;

  budgetData = computed(() => {
    const budgets = this.store.budgets();
    const transactions = this.store.transactions();

    return budgets.map(b => {
      const spent = transactions
        .filter(t => t.category === b.category && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const percent = Math.min((spent / b.amount) * 100, 100);
      const isOver = spent > b.amount;
      return { ...b, spent, percent, isOver };
    });
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
