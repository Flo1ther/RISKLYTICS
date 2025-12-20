import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

@Component({
  selector: 'app-market-overview',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') }
    }
  ],
  templateUrl: './marketOverview.component.html',
  styleUrls: ['./marketOverview.component.scss']
})
export class OverviewComponent implements OnInit {

  cryptoOptions: EChartsOption = {};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadTopCryptoMarketCap();
  }

  private loadTopCryptoMarketCap(): void {
    this.http.get<any[]>(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: '5',
          page: '1'
        }
      }
    ).subscribe(coins => {
      const pieData = coins.map(coin => ({
        name: coin.symbol.toUpperCase(),
        value: coin.market_cap
      }));

      this.cryptoOptions = this.buildPieChartOptions(
        pieData,
        'Top 5 Crypto — Market Cap (USD)'
      );
    });
  }

  private buildPieChartOptions(data: any[], titleText: string): EChartsOption {
    return {
      title: {
        text: titleText,
        left: 'center',
        textStyle: { color: '#fff', fontSize: 16 }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) =>
          `${params.name}<br/>Market Cap: ${this.formatNumber(params.value)}<br/>Share: ${params.percent}%`
      },
      legend: {
        bottom: 10,
        textStyle: { color: '#fff' }
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          data,
          label: { color: '#fff' },
          emphasis: {
            itemStyle: {
              shadowBlur: 15,
              shadowColor: 'rgba(0,0,0,0.6)'
            }
          }
        }
      ],
      backgroundColor: 'transparent'
    };
  }

  private formatNumber(value: number): string {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value}`;
  }
}
