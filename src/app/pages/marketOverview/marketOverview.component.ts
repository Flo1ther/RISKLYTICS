import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { firstValueFrom } from 'rxjs';

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
  stockOptions: EChartsOption = {};

  alphaVantageApiKey = 'PGKW3IT11YVAXUJ3';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadTopCrypto();
    this.loadTopStocks();
  }

  private loadTopCrypto(): void {
    this.http.get<any[]>('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: '5',
        page: '1'
      }
    }).subscribe({
      next: (data) => {
        this.cryptoOptions = {
          title: { text: 'Top 5 Crypto by Market Cap', left: 'center', textStyle: { color: '#fff' } },
          tooltip: { trigger: 'item' },
          series: [
            {
              name: 'Market Cap',
              type: 'pie',
              radius: '60%',
              data: data.map(asset => ({
                name: asset.name,
                value: asset.market_cap
              })),
              label: { color: '#fff' }
            }
          ],
          backgroundColor: 'transparent'
        };
      },
      error: err => console.error(err)
    });
  }

  private async loadTopStocks(): Promise<void> {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

    const requests = symbols.map(symbol =>
      firstValueFrom(
        this.http.get<any>('https://www.alphavantage.co/query', {
          params: {
            function: 'TIME_SERIES_DAILY',
            symbol,
            apikey: this.alphaVantageApiKey
          }
        })
      )
    );

    const responses = await Promise.all(requests);

    const results: { symbol: string; marketCap: number }[] = [];

    responses.forEach((res, i) => {
      const daily = res['Time Series (Daily)' as keyof typeof res] as any;

      if (!daily) return;

      const latest = Object.values(daily)[0] as any;

      const close = Number(latest['4. close']);
      const volume = Number(latest['5. volume']);

      const approxMarketCap = close * volume;

      results.push({
        symbol: symbols[i],
        marketCap: approxMarketCap
      });
    });

    this.stockOptions = {
      title: {
        text: 'Top 5 Stocks (approx Market Cap)',
        left: 'center',
        textStyle: { color: '#fff' }
      },
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: '60%',
          data: results.map(r => ({
            name: r.symbol,
            value: r.marketCap
          })),
          label: { color: '#fff' }
        }
      ],
      backgroundColor: 'transparent'
    };
  }
}
