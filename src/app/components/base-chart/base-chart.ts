import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, ViewChild, SimpleChanges } from '@angular/core';
import { Chart, registerables, ChartConfiguration, ChartType } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-base-chart',
  standalone: true,
  template: `
    <div class="chart-wrapper" style="position: relative; height: 300px; width: 100%;">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-wrapper {
      position: relative;
      height: 300px;
      width: 100%;
    }
  `]
})
export class BaseChartComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  @Input() type: ChartType = 'line';
  @Input() data: any = { labels: [], datasets: [] };
  @Input() options: any = {};
  @Input() id: string = `chart-${Math.random()}`;

  private chart: Chart | null = null;

  ngOnInit() {
    this.initChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.chart) {
      if (changes['data']) {
        this.chart.data.labels = this.data.labels;
        
        if (this.data.datasets) {
          this.data.datasets.forEach((newDataset: any, i: number) => {
            if (this.chart!.data.datasets[i]) {
              Object.assign(this.chart!.data.datasets[i], newDataset);
            } else {
              this.chart!.data.datasets[i] = newDataset;
            }
          });
          
          if (this.chart.data.datasets.length > this.data.datasets.length) {
            this.chart.data.datasets.splice(this.data.datasets.length);
          }
        }
      }

      if (changes['options']) {
        Object.assign(this.chart.options, this.options);
      }
      
      this.chart.update('none');
    }
  }

  private initChart() {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: this.type,
      data: this.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750
        },
        ...this.options
      }
    });
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
