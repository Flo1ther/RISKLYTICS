import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { forkJoin } from 'rxjs';

interface PortfolioAssetView {
  id: string;
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
  performanceChart: EChartsOption = {};

  totalPortfolioUsd = 0;
  loading = true;

  timeframe: 7 | 30 | 90 = 30;
  maxCompareAssets = 3;

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

  // 🔹 MAIN MARKET DATA (1 CALL)
  private loadMarketData(symbols: string[], portfolio: Portfolio): void {
    this.http.get<any[]>(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
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
          id: c.id,
          symbol: c.symbol.toUpperCase(),
          amount,
          price: c.current_price,
          valueUsd,
          change24h: c.price_change_percentage_24h,
          allocation: (valueUsd / this.totalPortfolioUsd) * 100
        };
      });

      this.buildAllocationChart();
      this.buildPerformanceCompare();

      this.loading = false;
    });
  }

  // 🥧 PIE
  private buildAllocationChart(): void {
    this.allocationChart = {
      title: {
        text: 'Portfolio Allocation',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}: ${p.value.toFixed(2)}%`
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

  // 📈 PERFORMANCE COMPARE
  private buildPerformanceCompare(): void {
    const coins = this.assets.slice(0, this.maxCompareAssets);

    forkJoin(
      coins.map(c =>
        this.http.get<any>(
          `https://api.coingecko.com/api/v3/coins/${c.id}/market_chart`,
          {
            params: {
              vs_currency: 'usd',
              days: this.timeframe.toString()
            }
          }
        )
      )
    ).subscribe(results => {

      const series = results.map((res, i) => ({
        name: coins[i].symbol,
        type: 'line'as const,
        data: this.normalize(res.prices),
        smooth: 0.35,
        showSymbol: false
      }));

      this.performanceChart = {
        title: {
          text: 'Performance Compare (%)',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: (p: any) =>
            p.map((i: any) =>
              `${i.seriesName}: ${i.data}%`
            ).join('<br/>')
        },
        xAxis: {
          type: 'category',
          data: results[0].prices.map((p: any) =>
            new Date(p[0]).toLocaleDateString()
          )
        },
        yAxis: {
          type: 'value',
          axisLabel: { formatter: '{value}%' }
        },
        series
      };
    });
  }

  changeTimeframe(days: number): void {
    if (days !== 7 && days !== 30 && days !== 90) return;

    this.timeframe = days;
    this.buildPerformanceCompare();
  }


  private normalize(prices: [number, number][]): number[] {
    const base = prices[0][1];
    return prices.map(p =>
      Number((((p[1] / base) - 1) * 100).toFixed(2))
    );
  }

  private getPortfolio(): Portfolio {
    return JSON.parse(localStorage.getItem('portfolio') || '{}');
  }
}
