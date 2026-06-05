import { Component, computed, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { Transaction } from '../../models/budget.models';
import { TransactionAmountPipe } from '../../pipes/transaction-amount.pipe';

@Component({
  selector: 'app-transactions',
  imports: [ReactiveFormsModule, SidebarComponent, TransactionAmountPipe],
  templateUrl: './transactions.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionsComponent {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  summary = this.store.summary;
  expenseCategories = this.store.expenseCategories;
  incomeCategories = this.store.incomeCategories;
  accounts = this.store.accounts;

  allCategories = computed(() => {
    return [...this.expenseCategories(), ...this.incomeCategories()];
  });

  searchQuery = signal('');
  filterCategory = signal('all');

  isConfirmDeleteOpen = signal(false);
  transactionToDelete = signal<number | null>(null);

  filteredTransactions = computed(() => {
    const transactions = this.store.transactions();
    const query = this.searchQuery().toLowerCase();
    const category = this.filterCategory();

    return transactions.filter(t => {
      const matchesSearch = t.vendor.toLowerCase().includes(query) || 
                            t.category.toLowerCase().includes(query);
      const matchesCategory = category === 'all' || t.category === category;
      return matchesSearch && matchesCategory;
    });
  });

  progress = computed(() => {
    const s = this.store.summary();
    return s.income > 0 ? (s.expense / s.income) * 100 : 0;
  });

  isModalOpen = signal(false);
  
  transactionForm: FormGroup = this.fb.group({
    vendor: ['', Validators.required],
    category: [this.expenseCategories()[0] || 'Food', Validators.required],
    account: [this.accounts()[0]?.id || 'visa-card', Validators.required],
    date: [new Date().toISOString().split('T')[0], Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    type: ['expense', Validators.required]
  });

  constructor() {
    this.transactionForm.get('type')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        const defaultCat = type === 'income' 
          ? (this.incomeCategories()[0] || 'Salary') 
          : (this.expenseCategories()[0] || 'Food');
        this.transactionForm.get('category')?.setValue(defaultCat);
      });
  }

  handleSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  handleFilter(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterCategory.set(select.value);
  }

  toggleModal() {
    this.isModalOpen.update(open => !open);
    if (!this.isModalOpen()) {
      this.transactionForm.reset({
        category: this.expenseCategories()[0] || 'Food',
        account: this.accounts()[0]?.id || 'visa-card',
        date: new Date().toISOString().split('T')[0],
        type: 'expense'
      });
    }
  }

  handleSubmit() {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.value;
      const newTransaction: Transaction = {
        id: Date.now(),
        ...formValue
      };
      
      this.store.addTransaction(newTransaction);
      this.toggleModal();
    }
  }

  confirmDeleteTransaction(id: number) {
    this.transactionToDelete.set(id);
    this.isConfirmDeleteOpen.set(true);
  }

  closeConfirmDelete() {
    this.isConfirmDeleteOpen.set(false);
    this.transactionToDelete.set(null);
  }

  executeDeleteTransaction() {
    const id = this.transactionToDelete();
    if (id !== null) {
      this.store.deleteTransaction(id);
      this.closeConfirmDelete();
    }
  }

  getAccountName(accountId: string): string {
    const acc = this.accounts().find(a => a.id === accountId);
    return acc ? acc.name : accountId;
  }
}
