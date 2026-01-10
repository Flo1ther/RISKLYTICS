import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

interface PortfolioAssetView {
  symbol: string;
  amount: number;
  price: number;
  valueUsd: number;
  change24h: number;
  allocation: number;
}

type Portfolio = Record<string, number>;

@Component({
  selector: 'app-compare-assets',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') }
    }
  ],
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss']
})
export class CompareComponent implements OnInit {

  assets: PortfolioAssetView[] = [];
  allocationChart: EChartsOption = {};
  loading = true;
  totalPortfolioUsd = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const portfolio = this.getPortfolio();
    const symbols = Object.keys(portfolio);

    if (!symbols.length) {
      this.loading = false;
      return;
    }

    this.loadMarketData(symbols, portfolio);
  }

  private loadMarketData(symbols: string[], portfolio: Portfolio): void {
    this.http.get<any[]>(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: '250',
          page: '1',
          price_change_percentage: '24h'
        }
      }
    ).subscribe(data => {

      const portfolioCoins = data.filter(c =>
        symbols.includes(c.symbol.toLowerCase())
      );

      this.totalPortfolioUsd = portfolioCoins.reduce(
        (sum, c) => sum + portfolio[c.symbol.toLowerCase()] * c.current_price,
        0
      );


      this.assets = portfolioCoins.map(c => {
        const amount = portfolio[c.symbol.toLowerCase()];
        const valueUsd = amount * c.current_price;

        return {
          symbol: c.symbol.toUpperCase(),
          amount,
          price: c.current_price,
          valueUsd,
          change24h: c.price_change_percentage_24h,
          allocation: (valueUsd / this.totalPortfolioUsd) * 100
        };
      });

      this.buildAllocationChart();
      this.loading = false;
    });
  }

  private buildAllocationChart(): void {
    this.allocationChart = {
      title: {
        text: 'Portfolio Allocation',
        left: 'center',
        textStyle: { fontSize: 16 }
      },
      tooltip: {
        trigger: 'item',
        formatter: (p: any) =>
          `${p.name}: ${p.value.toFixed(2)}%`
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          data: this.assets.map(a => ({
            name: a.symbol,
            value: a.allocation
          })),
          label: {
            formatter: '{b}\n{d}%'
          }
        }
      ]
    };
  }

  private getPortfolio(): Portfolio {
    return JSON.parse(localStorage.getItem('portfolio') || '{}');
  }
}
