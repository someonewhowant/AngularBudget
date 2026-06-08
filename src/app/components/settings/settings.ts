import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { ToastService } from '../../services/toast.service';
import { Account } from '../../models/budget.models';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  readonly store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private router = inject(Router);
  
  state = this.store.state;
  currencies = this.store.currencies;
  accounts = this.store.accountsWithBalance;
  currencySymbol = this.store.currencySymbol;
  expenseCategories = this.store.expenseCategories;
  incomeCategories = this.store.incomeCategories;

  isConfirmResetOpen = signal(false);
  isAccountModalOpen = signal(false);
  isConfirmDeleteAccountOpen = signal(false);
  editingAccount = signal<Account | null>(null);
  accountToDelete = signal<string | null>(null);

  accountForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    type: ['checking', Validators.required],
    initialBalance: [0, [Validators.required, Validators.min(0)]]
  });
  
  profileForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    currency: ['USD', Validators.required],
    budgetStartDay: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
    budgetWarningThreshold: [85, [Validators.required, Validators.min(1), Validators.max(100)]],
    enableBudgetOverrunAlert: [true],
    enableBudgetWarningAlert: [true],
    enableBudgetRollover: [false],
    language: ['en', Validators.required]
  });

  catForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    type: ['expense', Validators.required]
  });

  themes = [
    { id: 'dark', name: 'Sleek Obsidian', color: '#0d1117' },
    { id: 'light', name: 'Arctic Frost', color: '#e8eef2' },
    { id: 'blue', name: 'Cyber Ocean', color: '#0a0a1a' }
  ];

  ngOnInit(): void {
    const user = this.store.user();
    if (user) {
      this.profileForm.patchValue({
        name: user.name,
        currency: user.currency || 'USD',
        budgetStartDay: user.budgetStartDay || 1,
        budgetWarningThreshold: user.budgetWarningThreshold !== undefined ? user.budgetWarningThreshold : 85,
        enableBudgetOverrunAlert: user.enableBudgetOverrunAlert !== false,
        enableBudgetWarningAlert: user.enableBudgetWarningAlert !== false,
        enableBudgetRollover: !!user.enableBudgetRollover,
        language: user.language || 'en'
      }, { emitEvent: false });
    }
  }

  handleProfileSubmit() {
    if (this.profileForm.valid) {
      this.store.updateProfile({
        name: this.profileForm.value.name,
        currency: this.profileForm.value.currency,
        budgetStartDay: Number(this.profileForm.value.budgetStartDay),
        budgetWarningThreshold: Number(this.profileForm.value.budgetWarningThreshold),
        enableBudgetOverrunAlert: !!this.profileForm.value.enableBudgetOverrunAlert,
        enableBudgetWarningAlert: !!this.profileForm.value.enableBudgetWarningAlert,
        enableBudgetRollover: !!this.profileForm.value.enableBudgetRollover,
        language: this.profileForm.value.language
      });
      this.toastService.show(this.store.t().saveProfileSuccess || 'Profile updated successfully!', 'success');
    }
  }

  handleThemeChange(themeId: string) {
    this.store.setTheme(themeId);
    this.toastService.show(`Theme changed to ${themeId}!`, 'info');
  }

  handleLanguageChange(lang: 'en' | 'ru') {
    const user = this.store.user();
    this.store.updateProfile({
      ...user,
      language: lang
    });
    this.profileForm.get('language')?.setValue(lang, { emitEvent: false });
    this.toastService.show(lang === 'ru' ? 'Язык успешно изменен!' : 'Language changed successfully!', 'success');
  }

  handleAddCategory() {
    if (this.catForm.valid) {
      const { name, type } = this.catForm.value;
      const cleanName = name.trim();
      if (!cleanName) return;
      
      if (type === 'expense') {
        if (this.expenseCategories().some(c => c.toLowerCase() === cleanName.toLowerCase())) {
          this.toastService.show(`Expense category "${cleanName}" already exists!`, 'info');
          return;
        }
        this.store.addExpenseCategory(cleanName);
      } else {
        if (this.incomeCategories().some(c => c.toLowerCase() === cleanName.toLowerCase())) {
          this.toastService.show(`Income category "${cleanName}" already exists!`, 'info');
          return;
        }
        this.store.addIncomeCategory(cleanName);
      }
      this.toastService.show(`Category "${cleanName}" added successfully!`, 'success');
      this.catForm.get('name')?.reset('');
    }
  }

  handleDeleteCategory(cat: string, type: 'expense' | 'income') {
    if (type === 'expense') {
      this.store.deleteExpenseCategory(cat);
    } else {
      this.store.deleteIncomeCategory(cat);
    }
    this.toastService.show(`Category "${cat}" deleted!`, 'success');
  }

  confirmReset() {
    this.isConfirmResetOpen.set(true);
  }

  closeConfirmReset() {
    this.isConfirmResetOpen.set(false);
  }

  executeReset() {
    this.store.resetData();
    this.closeConfirmReset();
    this.toastService.show('All application data has been reset.', 'info');
  }

  exportData() {
    const state = this.store.state();
    const data = {
      transactions: state.transactions,
      budgets: state.budgets,
      savingsGoals: state.savingsGoals,
      theme: state.theme,
      user: state.user,
      accounts: state.accounts,
      recurringTransactions: state.recurringTransactions,
      expenseCategories: this.store.expenseCategories(),
      incomeCategories: this.store.incomeCategories()
    };
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.toastService.show('Data exported successfully!', 'success');
  }

  importData(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data && data.transactions !== undefined) {
          localStorage.setItem('transactions', JSON.stringify(data.transactions));
          if (data.budgets) localStorage.setItem('budgets', JSON.stringify(data.budgets));
          if (data.savingsGoals) localStorage.setItem('savingsGoals', JSON.stringify(data.savingsGoals));
          if (data.theme) localStorage.setItem('theme', data.theme);
          if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
          if (data.accounts) localStorage.setItem('accounts', JSON.stringify(data.accounts));
          if (data.recurringTransactions) localStorage.setItem('recurringTransactions', JSON.stringify(data.recurringTransactions));
          if (data.expenseCategories) localStorage.setItem('expenseCategories', JSON.stringify(data.expenseCategories));
          if (data.incomeCategories) localStorage.setItem('incomeCategories', JSON.stringify(data.incomeCategories));
          
          this.toastService.show('Data imported successfully! Reloading...', 'success');
          setTimeout(() => location.reload(), 1500);
        } else {
          this.toastService.show('Invalid backup file format.', 'error');
        }
      } catch (err) {
        this.toastService.show('Error reading file.', 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be selected again if needed
    event.target.value = '';
  }

  replayTour() {
    this.store.updateProfile({ hasCompletedOnboarding: false });
    this.toastService.show('Restarting onboarding tour...', 'info');
    this.router.navigate(['/']);
  }

  exportToCSV() {
    const transactions = this.store.transactions();
    if (!transactions || transactions.length === 0) {
      this.toastService.show('No transactions found to export.', 'info');
      return;
    }

    const headers = ['Date', 'Vendor', 'Category', 'Account', 'Type', 'Amount'];
    const csvRows = [headers.join(',')];

    for (const tx of transactions) {
      const values = [
        tx.date || '',
        `"${(tx.vendor || '').replace(/"/g, '""')}"`,
        `"${(tx.category || '').replace(/"/g, '""')}"`,
        `"${(tx.account || '').replace(/"/g, '""')}"`,
        tx.type || '',
        tx.amount || 0
      ];
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.toastService.show('Transactions exported to CSV successfully!', 'success');
  }

  openAccountModal(account?: Account) {
    this.isAccountModalOpen.set(true);
    if (account) {
      this.editingAccount.set(account);
      this.accountForm.patchValue({
        name: account.name,
        type: account.type,
        initialBalance: account.initialBalance
      });
    } else {
      this.editingAccount.set(null);
      this.accountForm.reset({
        name: '',
        type: 'checking',
        initialBalance: 0
      });
    }
  }

  closeAccountModal() {
    this.isAccountModalOpen.set(false);
    this.editingAccount.set(null);
  }

  handleAccountSubmit() {
    if (this.accountForm.valid) {
      const accountData = this.accountForm.value;
      const currentEditing = this.editingAccount();
      if (currentEditing) {
        this.store.updateAccount({ ...currentEditing, ...accountData });
        this.toastService.show('Account updated successfully!', 'success');
      } else {
        this.store.addAccount(accountData);
        this.toastService.show('Account created successfully!', 'success');
      }
      this.closeAccountModal();
    }
  }

  confirmDeleteAccount(id: string) {
    this.accountToDelete.set(id);
    this.isConfirmDeleteAccountOpen.set(true);
  }

  closeConfirmDeleteAccount() {
    this.isConfirmDeleteAccountOpen.set(false);
    this.accountToDelete.set(null);
  }

  executeDeleteAccount() {
    const id = this.accountToDelete();
    if (id !== null) {
      this.store.deleteAccount(id);
      this.closeConfirmDeleteAccount();
      this.toastService.show('Account deleted successfully!', 'success');
    }
  }

  getAccountTypeIcon(type: string): string {
    switch (type) {
      case 'checking': return 'fa-university';
      case 'savings': return 'fa-piggy-bank';
      case 'credit': return 'fa-credit-card';
      case 'cash': return 'fa-coins';
      default: return 'fa-wallet';
    }
  }
}
