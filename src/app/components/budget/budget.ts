import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { BaseChartComponent } from '../base-chart/base-chart';
import { map, combineLatest, take } from 'rxjs';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, BaseChartComponent],
  templateUrl: './budget.html',
})
export class BudgetComponent implements OnInit {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);

  state$ = this.store.getState();
  summary$ = this.store.getSummary$();

  budgets$ = this.state$.pipe(map(s => s.budgets));

  budgetData$ = combineLatest([
    this.budgets$,
    this.state$.pipe(map(s => s.transactions))
  ]).pipe(
    map(([budgets, transactions]) => {
      return budgets.map(b => {
        const spent = transactions
          .filter(t => t.category === b.category && t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const percent = Math.min((spent / b.amount) * 100, 100);
        const isOver = spent > b.amount;
        return { ...b, spent, percent, isOver };
      });
    })
  );

  savingsInfo$ = combineLatest([
    this.summary$,
    this.state$.pipe(map(s => s.savingsGoal))
  ]).pipe(
    map(([summary, goal]) => {
      const currentBalance = summary.balance;
      const progressPercent = Math.min(Math.round((currentBalance / goal) * 100), 100);
      const remaining = Math.max(goal - currentBalance, 0);
      return { currentBalance, goal, progressPercent, remaining };
    })
  );

  chartData$ = this.budgetData$.pipe(
    map(budgets => ({
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
    }))
  );

  isModalOpen = false;
  isGoalModalOpen = false;
  budgetForm: FormGroup = this.fb.group({
    category: ['Food', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]]
  });

  goalForm: FormGroup = this.fb.group({
    goal: [50000, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.state$.pipe(take(1)).subscribe(state => {
      this.goalForm.patchValue({ goal: state.savingsGoal }, { emitEvent: false });
    });
  }

  toggleModal() {
    this.isModalOpen = !this.isModalOpen;
  }

  toggleGoalModal() {
    this.isGoalModalOpen = !this.isGoalModalOpen;
    if (!this.isGoalModalOpen) {
      this.state$.pipe(take(1)).subscribe(state => {
        this.goalForm.patchValue({ goal: state.savingsGoal }, { emitEvent: false });
      });
    }
  }

  handleBudgetSubmit() {
    if (this.budgetForm.valid) {
      const { category, amount } = this.budgetForm.value;
      this.store.setBudget(category, amount);
      this.toggleModal();
    }
  }

  handleGoalSubmit() {
    if (this.goalForm.valid) {
      this.store.setSavingsGoal(this.goalForm.value.goal);
      this.toggleGoalModal();
    }
  }
}
