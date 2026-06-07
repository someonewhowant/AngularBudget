import { Component, computed, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { Transaction } from '../../models/budget.models';
import { TransactionAmountPipe } from '../../pipes/transaction-amount.pipe';
import { ToastService } from '../../services/toast.service';

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
  private toastService = inject(ToastService);

  summary = this.store.summary;
  expenseCategories = this.store.expenseCategories;
  incomeCategories = this.store.incomeCategories;
  accounts = this.store.accounts;
  currencySymbol = this.store.currencySymbol;

  allCategories = computed(() => {
    return [...this.expenseCategories(), ...this.incomeCategories()];
  });

  searchQuery = signal('');
  filterCategory = signal('all');
  filterAccount = signal('all');
  filterType = signal('all');
  startDate = signal('');
  endDate = signal('');
  sortBy = signal('date-desc');
  isAdvancedOpen = signal(false);

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.filterAccount() !== 'all') count++;
    if (this.filterType() !== 'all') count++;
    if (this.startDate()) count++;
    if (this.endDate()) count++;
    return count;
  });

  isConfirmDeleteOpen = signal(false);
  transactionToDelete = signal<number | null>(null);
  editingTransaction = signal<Transaction | null>(null);

  filteredTransactions = computed(() => {
    let transactions = [...this.store.transactions()];
    const query = this.searchQuery().toLowerCase();
    const category = this.filterCategory();
    const account = this.filterAccount();
    const type = this.filterType();
    const start = this.startDate();
    const end = this.endDate();

    // 1. Filter
    transactions = transactions.filter(t => {
      const matchesSearch = t.vendor.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query);
      const matchesCategory = category === 'all' || t.category === category;
      const matchesAccount = account === 'all' || t.account === account;
      const matchesType = type === 'all' || t.type === type;

      let matchesDate = true;
      if (start) {
        matchesDate = matchesDate && t.date >= start;
      }
      if (end) {
        matchesDate = matchesDate && t.date <= end;
      }

      return matchesSearch && matchesCategory && matchesAccount && matchesType && matchesDate;
    });

    // 2. Sort
    const sort = this.sortBy();
    transactions.sort((a, b) => {
      if (sort === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sort === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sort === 'amount-desc') {
        return Number(b.amount) - Number(a.amount);
      } else if (sort === 'amount-asc') {
        return Number(a.amount) - Number(b.amount);
      }
      return 0;
    });

    return transactions;
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

  handleFilterAccount(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterAccount.set(select.value);
  }

  handleFilterType(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterType.set(select.value);
  }

  handleStartDate(event: Event) {
    const input = event.target as HTMLInputElement;
    this.startDate.set(input.value);
  }

  handleEndDate(event: Event) {
    const input = event.target as HTMLInputElement;
    this.endDate.set(input.value);
  }

  handleSortBy(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.sortBy.set(select.value);
  }

  clearFilters() {
    this.filterCategory.set('all');
    this.filterAccount.set('all');
    this.filterType.set('all');
    this.startDate.set('');
    this.endDate.set('');
    this.sortBy.set('date-desc');
    this.searchQuery.set('');
  }

  toggleModal(transaction?: Transaction) {
    this.isModalOpen.update(open => !open);
    if (this.isModalOpen()) {
      if (transaction) {
        this.editingTransaction.set(transaction);
        this.transactionForm.patchValue({
          vendor: transaction.vendor,
          category: transaction.category,
          account: transaction.account,
          date: transaction.date,
          amount: transaction.amount,
          type: transaction.type
        });
      } else {
        this.editingTransaction.set(null);
        this.transactionForm.reset({
          vendor: '',
          category: this.expenseCategories()[0] || 'Food',
          account: this.accounts()[0]?.id || 'visa-card',
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          type: 'expense'
        });
      }
    } else {
      this.editingTransaction.set(null);
    }
  }

  handleSubmit() {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.value;
      const editing = this.editingTransaction();

      if (editing) {
        const updatedTransaction: Transaction = {
          ...editing,
          ...formValue
        };
        this.store.updateTransaction(updatedTransaction);
        this.toastService.show('Transaction updated successfully!', 'success');
      } else {
        const newTransaction: Transaction = {
          id: Date.now(),
          ...formValue
        };
        this.store.addTransaction(newTransaction);
        this.toastService.show('Transaction added successfully!', 'success');
      }
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
      this.toastService.show('Transaction deleted successfully!', 'success');
    }
  }

  getAccountName(accountId: string): string {
    const acc = this.accounts().find(a => a.id === accountId);
    return acc ? acc.name : accountId;
  }
}
