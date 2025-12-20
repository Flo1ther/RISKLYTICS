import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts';

interface CryptoData {
  name: string;
  symbol: string;
  price: number;
  sparkline: number[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxEchartsModule],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') }
    }
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  popularAssets: CryptoData[] = [];
  marketOverview: any[] = [];

  assetChartOptions: { [symbol: string]: EChartsOption } = {};
  riskGaugeOption: EChartsOption = {};

  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCryptoData();
  }

  /* =======================
     LOAD CRYPTO DATA
     ======================= */
  private loadCryptoData(): void {
    this.http.get<any[]>(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: '10',
          page: '1',
          sparkline: 'true'
        }
      }
    ).subscribe({
      next: (data) => {
        this.popularAssets = data.slice(0, 4).map(asset => ({
          name: asset.name,
          symbol: asset.symbol.toUpperCase(),
          price: asset.current_price,
          sparkline: asset.sparkline_in_7d?.price?.slice(-30) || []
        }));

        this.popularAssets.forEach(asset => {
          this.assetChartOptions[asset.symbol] =
            this.buildSparklineChart(asset.sparkline, '#409EFF');
        });

        this.marketOverview = data.map(asset => ({
          name: asset.name,
          symbol: asset.symbol.toUpperCase(),
          change: asset.price_change_percentage_24h,
          volume: `$${(asset.total_volume / 1_000_000_000).toFixed(1)}B`,
          risk: this.getRiskLevel(asset.price_change_percentage_24h)
        }));

        this.updateGlobalRisk();
        this.loading = false;
      },
      error: (err) => {
        console.error('Crypto data error:', err);
        this.loading = false;
      }
    });
  }

  /* =======================
     SPARKLINE CHART
     ======================= */
  private buildSparklineChart(data: number[], color: string): EChartsOption {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const padding = (max - min) * 0.05;

    return {
      backgroundColor: '#121212',
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => `$${params[0].value.toFixed(2)}`,
        axisPointer: { type: 'cross' },
        backgroundColor: '#222',
        textStyle: { color: '#fff' }
      },
      xAxis: {
        type: 'category',
        data: data.map((_, i) => i + 1),
        boundaryGap: false,
        axisLabel: { color: '#aaa' },
        axisLine: { lineStyle: { color: '#555' } }
      },
      yAxis: {
        type: 'value',
        min: min - padding,
        max: max + padding,
        axisLabel: {
          color: '#aaa',
          formatter: (v: number) => `$${v.toFixed(2)}`
        },
        splitLine: { lineStyle: { color: '#333' } }
      },
      grid: { left: 30, right: 20, top: 20, bottom: 30 },
      series: [
        {
          type: 'line',
          data: data.map(v => Number(v.toFixed(2))),
          smooth: true,
          showSymbol: false,
          lineStyle: { color, width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color + '88' },
              { offset: 1, color: color + '11' }
            ])
          }
        }
      ]
    };
  }

  /* =======================
     GLOBAL RISK GAUGE
     ======================= */
  private updateGlobalRisk(): void {
    const valid = this.popularAssets.filter(a => a.sparkline.length > 1);

    const avgRisk = valid.length
      ? valid.reduce((acc, a) =>
          acc + Math.abs(a.sparkline.at(-1)! - a.sparkline[0]), 0
        ) / valid.length
      : 0;

    this.riskGaugeOption = {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 10,
          detail: { formatter: '{value}' },
          data: [{ value: Math.min(avgRisk * 10, 10), name: 'Risk' }]
        }
      ]
    };
  }

  /* =======================
     RISK LEVEL
     ======================= */
  private getRiskLevel(change: number): string {
    const abs = Math.abs(change);
    if (abs < 1) return 'Low';
    if (abs < 3) return 'Medium';
    return 'High';
  }
}
