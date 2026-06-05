import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'transactionAmount',
  pure: true
})
export class TransactionAmountPipe implements PipeTransform {
  transform(amount: number | string, type: 'income' | 'expense', currencySymbol: string = '$'): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '';
    
    const prefix = type === 'income' ? '+' : '-';
    return `${prefix}${currencySymbol}${numericAmount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }
}
