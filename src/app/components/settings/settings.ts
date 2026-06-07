import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, SidebarComponent],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private router = inject(Router);
  
  state = this.store.state;
  currencies = this.store.currencies;

  isConfirmResetOpen = signal(false);
  
  profileForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    currency: ['USD', Validators.required]
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
        currency: user.currency || 'USD'
      }, { emitEvent: false });
    }
  }

  handleProfileSubmit() {
    if (this.profileForm.valid) {
      this.store.updateProfile({
        name: this.profileForm.value.name,
        currency: this.profileForm.value.currency
      });
      this.toastService.show('Profile updated successfully!', 'success');
    }
  }

  handleThemeChange(themeId: string) {
    this.store.setTheme(themeId);
    this.toastService.show(`Theme changed to ${themeId}!`, 'info');
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
}
