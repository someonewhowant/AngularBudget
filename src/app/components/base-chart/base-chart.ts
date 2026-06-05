import { Component, ElementRef, viewChild, input, effect, ChangeDetectionStrategy } from '@angular/core';
import { Chart, registerables, ChartType } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-base-chart',
  templateUrl: './base-chart.html',
  styleUrl: './base-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaseChartComponent {
  chartCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  
  type = input<ChartType>('line');
  data = input<any>({ labels: [], datasets: [] });
  options = input<any>({});
  id = input<string>(`chart-${Math.random()}`);

  private chart: Chart | null = null;

  constructor() {
    effect((onCleanup) => {
      const canvasEl = this.chartCanvas();
      if (!canvasEl) return;

      const ctx = canvasEl.nativeElement.getContext('2d');
      if (!ctx) return;

      const currentType = this.type();
      const currentData = this.data();
      const currentOptions = this.options();

      if (this.chart) {
        this.chart.destroy();
      }

      this.chart = new Chart(ctx, {
        type: currentType,
        data: currentData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 750
          },
          ...currentOptions
        }
      });

      onCleanup(() => {
        if (this.chart) {
          this.chart.destroy();
          this.chart = null;
        }
      });
    });
  }
}
