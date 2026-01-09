import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

interface PortfolioItem {
  amount: number;
  totalUsd: number;
}

type Portfolio = Record<string, PortfolioItem>;

@Component({
  selector: 'app-market-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsModule],
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

  topMarketCapOptions: EChartsOption = {};
  cryptoPriceOptions: EChartsOption = {};
  searchSymbol: string = '';
  currentCoinId: string | null = null;
  currentCoinSymbol: string | null = null;
  currentPrice: number = 0;
  tradeAmount: number = 0;
  flashMessageText = '';
  flashMessageVisible = false;


  constructor(private http: HttpClient) {}
  

  ngOnInit(): void {
    this.loadTopCryptoMarketCap();
  }

  private showFlash(message: string): void {
    this.flashMessageText = message;
    this.flashMessageVisible = true;

    setTimeout(() => {
      this.flashMessageVisible = false;
    }, 2000);
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
      const data = coins.map(c => ({
        name: c.symbol.toUpperCase(),
        value: c.market_cap
      }));

      this.topMarketCapOptions = {
        title: {
          text: 'Top 5 Crypto — Market Cap',
          left: 'center',
          textStyle: {
            color: '#111',
            fontSize: 16,
            fontWeight: 600
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: (p: any) =>
            `${p.name}<br/>$${p.value.toLocaleString()}`
        },
        legend: {
          bottom: 10,
          textStyle: { color: '##111' }
        },
        series: [
          {
            type: 'pie',
            radius: ['45%', '70%'],
            data,
            label: { color: '##111' }
          }
        ],
        backgroundColor: 'transparent'
      };
    });
  }

  searchCrypto(): void {
    const symbol = this.searchSymbol.trim().toLowerCase();
    if (!symbol) return;

    this.http.get<any[]>(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          per_page: '250',
          page: '1'
        }
      }
    ).subscribe(coins => {

      const coin = coins.find(
        c => c.symbol.toLowerCase() === symbol
      );

      if (!coin) {
        alert('Crypto not found');
        return;
      }

      this.fetchMarketChart(coin.id, coin.symbol.toUpperCase());
      this.currentCoinId = coin.id;
      this.currentCoinSymbol = coin.symbol.toLowerCase();
    });
  }

  private fetchMarketChart(coinId: string, symbol: string): void {
    this.http.get<any>(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: 'usd',
          days: '30'
        }
      }
    ).subscribe(res => {

      const data: [string, number][] = res.prices.map(
        (p: [number, number]) => [
          new Date(p[0]).toLocaleDateString(),
          p[1]
        ]
      );

      this.currentPrice = res.prices[res.prices.length - 1][1];

      this.cryptoPriceOptions = {
        title: {
          text: `${symbol} Price — 30 Days`,
          left: 'center',
          textStyle: {
            color: '#fff',
            fontSize: 18,
            fontWeight: 600
          }
        },
        tooltip: {
          trigger: 'axis',
          formatter: (p: any) =>
            `${p[0].axisValue}<br/><strong>$${p[0].data.toFixed(2)}</strong>`
        },
        xAxis: {
          type: 'category',
          data: data.map(d => d[0]),
          boundaryGap: false,
          axisLabel: { color: '#cbd5e1' }
        },
        yAxis: {
          type: 'value',
          scale: true, // 🔥
          axisLabel: {
            color: '#cbd5e1',
            formatter: (v: number) => `$${v}`
          }
        },
        series: [
          {
            type: 'line',
            data: data.map(d => d[1]),
            smooth: 0.4,
            showSymbol: false,
            lineStyle: { width: 2 },
            areaStyle: { opacity: 0.3 }
          }
        ],
        backgroundColor: 'transparent'
      };
    });
  }

  buy(): void {
    if (!this.currentCoinSymbol || this.tradeAmount <= 0) return;

    const portfolio = this.getPortfolio();
    const price = this.currentPrice;

    const current = portfolio[this.currentCoinSymbol] || {
      amount: 0,
      totalUsd: 0
    };

    const buyValue = this.tradeAmount * price;

    portfolio[this.currentCoinSymbol] = {
      amount: current.amount + this.tradeAmount,
      totalUsd: Number((current.totalUsd + buyValue).toFixed(3))
    };

    this.savePortfolio(portfolio);

    this.showFlash(
      `Bought ${this.tradeAmount} ${this.currentCoinSymbol.toUpperCase()} for $${buyValue.toFixed(2)}`
    );
  }

  sell(): void {
    if (!this.currentCoinSymbol || this.tradeAmount <= 0) return;

    const portfolio = this.getPortfolio();
    const current = portfolio[this.currentCoinSymbol];

    if (!current || this.tradeAmount > current.amount) {
      this.showFlash('Not enough asset to sell');
      return;
    }

    const ratio = this.tradeAmount / current.amount;
    const usdToRemove = current.totalUsd * ratio;

    const newAmount = current.amount - this.tradeAmount;
    const newTotalUsd = current.totalUsd - usdToRemove;

    if (newAmount === 0) {
      delete portfolio[this.currentCoinSymbol];
    } else {
      portfolio[this.currentCoinSymbol] = {
        amount: newAmount,
        totalUsd: newTotalUsd
      };
    }

    this.savePortfolio(portfolio);

    this.showFlash(
      `Sold ${this.tradeAmount} ${this.currentCoinSymbol.toUpperCase()}`
    );
  }



  private getPortfolio(): Portfolio {
    return JSON.parse(localStorage.getItem('portfolio') || '{}');
  }

  private savePortfolio(portfolio: Portfolio): void {
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
  }
}
