import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

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

  private loadCryptoData(): void {
    this.http.get<any[]>(
      '/api/api/v3/coins/markets',
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

  private buildSparklineChart(data: number[], color: string): EChartsOption {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const isStable = (max - min) / min < 0.01;

    return {
      backgroundColor: 'transparent',

      tooltip: {
        trigger: 'axis',
        formatter: (p: any) =>
          `$${p[0].data.toFixed(isStable ? 3 : 2)}`,
        axisPointer: { type: 'line' }
      },

      grid: {
        left: 4,
        right: 4,
        top: 6,
        bottom: 6
      },

      xAxis: {
        type: 'category',
        data: data.map((_, i) => i),
        boundaryGap: false,
        show: false
      },

      yAxis: {
        type: 'value',
        scale: !isStable,
        min: isStable ? 0.995 : undefined,
        max: isStable ? 1.005 : undefined,
        show: false
      },

      series: [
        {
          type: 'line',
          data,
          smooth: 0.35,
          showSymbol: false,
          lineStyle: {
            color,
            width: 1.8
          },
          areaStyle: {
            opacity: 0.25
          }
        }
      ]
    };
  }

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

  private getRiskLevel(change: number): string {
    const abs = Math.abs(change);
    if (abs < 1) return 'Low';
    if (abs < 3) return 'Medium';
    return 'High';
  }
}
