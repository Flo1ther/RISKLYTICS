import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, NgxEchartsModule],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') } // ленивий імпорт
    }
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  popularAssets: any[] = [];
  marketOverview: any[] = [];
  loading = true;

  assetChartOptions: { [symbol: string]: EChartsOption } = {};
  riskGaugeOption: EChartsOption = {};

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadMarketData();
  }

  loadMarketData() {
    this.http.get<any[]>('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: '10',
        page: '1',
        sparkline: 'true'
      }
    }).subscribe({
      next: (data) => {

        // топ-3 активи
        this.popularAssets = data.slice(0, 3).map(asset => {
          const sparklineData = Array.isArray(asset.sparkline_in_7d?.price) && asset.sparkline_in_7d.price.length
            ? asset.sparkline_in_7d.price
            : [asset.current_price, asset.current_price + 1, asset.current_price - 1]; // fallback

          console.log(asset.name, sparklineData); // перевірка даних

          return {
            name: asset.name,
            symbol: asset.symbol.toUpperCase(),
            price: asset.current_price,
            sparkline: sparklineData
          };
        });

        // sparkline графіки
        this.popularAssets.forEach(asset => {
          this.assetChartOptions[asset.symbol] = {
            xAxis: { type: 'category', data: asset.sparkline.map((_: number, i: number) => i) },
            yAxis: { type: 'value' },
            series: [{
              data: asset.sparkline,
              type: 'line',
              smooth: true,
              lineStyle: { color: '#409EFF' }
            }],
            tooltip: { trigger: 'axis' },
            grid: { left: 10, right: 10, top: 10, bottom: 10 }
          };
        });

        // таблиця Market Overview
        this.marketOverview = data.map(asset => ({
          name: asset.name,
          symbol: asset.symbol.toUpperCase(),
          change: asset.price_change_percentage_24h,
          volume: `$${(asset.total_volume / 1_000_000_000).toFixed(1)}B`,
          risk: this.getRiskLevel(asset.price_change_percentage_24h)
        }));

        // глобальний ризик
        const validSparklines = this.popularAssets.filter(a => a.sparkline.length > 1);
        const avgRisk = validSparklines.length
          ? validSparklines.reduce((acc, a) => acc + Math.abs(a.sparkline[a.sparkline.length - 1] - a.sparkline[0]), 0) / validSparklines.length
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

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.loading = false;
      }
    });
  }

  getRiskLevel(change: number): string {
    if (Math.abs(change) < 1) return 'Low';
    if (Math.abs(change) < 3) return 'Medium';
    return 'High';
  }
}
