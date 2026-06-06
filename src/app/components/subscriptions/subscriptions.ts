import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { RecurringTransaction } from '../../models/budget.models';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-subscriptions',
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './subscriptions.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionsComponent {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  recurringTransactions = this.store.recurringTransactions;
  accounts = this.store.accounts;
  expenseCategories = this.store.expenseCategories;
  incomeCategories = this.store.incomeCategories;
  currencySymbol = this.store.currencySymbol;

  allCategories = computed(() => {
    return [...this.expenseCategories(), ...this.incomeCategories()];
  });

  isModalOpen = signal(false);
  editingSubscription = signal<RecurringTransaction | null>(null);

  isConfirmDeleteOpen = signal(false);
  subscriptionToDelete = signal<number | null>(null);

  subForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    category: [this.expenseCategories()[0] || 'Food', Validators.required],
    account: [this.accounts()[0]?.id || 'visa-card', Validators.required],
    type: ['expense', Validators.required],
    frequency: ['monthly', Validators.required],
    startDate: [new Date().toISOString().split('T')[0], Validators.required],
    nextDueDate: [new Date().toISOString().split('T')[0], Validators.required],
    isActive: [true]
  });

  constructor() {
    this.subForm.get('type')?.valueChanges.subscribe(type => {
      const defaultCat = type === 'income' 
        ? (this.incomeCategories()[0] || 'Salary') 
        : (this.expenseCategories()[0] || 'Food');
      this.subForm.get('category')?.setValue(defaultCat);
    });
  }

  toggleModal(sub?: RecurringTransaction) {
    this.isModalOpen.update(open => !open);
    if (this.isModalOpen()) {
      if (sub) {
        this.editingSubscription.set(sub);
        this.subForm.patchValue({
          name: sub.name,
          amount: sub.amount,
          category: sub.category,
          account: sub.account,
          type: sub.type,
          frequency: sub.frequency,
          startDate: sub.startDate,
          nextDueDate: sub.nextDueDate,
          isActive: sub.isActive
        });
      } else {
        this.editingSubscription.set(null);
        this.subForm.reset({
          name: '',
          amount: 0,
          category: this.expenseCategories()[0] || 'Food',
          account: this.accounts()[0]?.id || 'visa-card',
          type: 'expense',
          frequency: 'monthly',
          startDate: new Date().toISOString().split('T')[0],
          nextDueDate: new Date().toISOString().split('T')[0],
          isActive: true
        });
      }
    }
  }

  handleToggleActive(sub: RecurringTransaction) {
    const updated = { ...sub, isActive: !sub.isActive };
    this.store.updateRecurringTransaction(updated);
    this.toastService.show(
      `Subscription ${sub.name} is now ${updated.isActive ? 'active' : 'paused'}`,
      'success'
    );
  }

  handleSubSubmit() {
    if (this.subForm.valid) {
      const formData = this.subForm.value;
      const currentEditing = this.editingSubscription();
      
      if (currentEditing) {
        this.store.updateRecurringTransaction({ ...currentEditing, ...formData });
        this.toastService.show('Subscription updated successfully!', 'success');
      } else {
        this.store.addRecurringTransaction(formData);
        this.toastService.show('Subscription created successfully!', 'success');
      }
      this.toggleModal();
    }
  }

  confirmDeleteSubscription(id: number) {
    this.subscriptionToDelete.set(id);
    this.isConfirmDeleteOpen.set(true);
  }

  closeConfirmDelete() {
    this.isConfirmDeleteOpen.set(false);
    this.subscriptionToDelete.set(null);
  }

  executeDeleteSubscription() {
    const id = this.subscriptionToDelete();
    if (id !== null) {
      this.store.deleteRecurringTransaction(id);
      this.closeConfirmDelete();
      this.toastService.show('Subscription deleted successfully!', 'success');
    }
  }

  getAccountName(accountId: string): string {
    const acc = this.accounts().find(a => a.id === accountId);
    return acc ? acc.name : accountId;
  }
}
