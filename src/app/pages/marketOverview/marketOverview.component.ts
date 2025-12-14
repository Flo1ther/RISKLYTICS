import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { environment } from '../../environments/environment';
import { forkJoin } from 'rxjs';

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

  cryptoOptions: EChartsOption = {};
  stockOptions: EChartsOption = {};

  /** Новий графік для пошуку */
  searchOptions: EChartsOption | null = null;

  cryptoSearchSymbol = '';
  stockSearchSymbol = '';

  private rapidApiHeaders = new HttpHeaders({
    'x-rapidapi-host': 'yahoo-finance15.p.rapidapi.com',
    'x-rapidapi-key': environment.rapidApiKey
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadTopCrypto();
    this.loadTopStocks();
  }

  /** ---------- TOP CRYPTO ---------- */
  private loadTopCrypto(): void {
    this.http.get<any[]>('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: '5',
        page: '1'
      }
    }).subscribe(topCoins => {
      const historyRequests = topCoins.map(coin =>
        this.http.get<any>(`https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart`, {
          params: { vs_currency: 'usd', days: '7' }
        })
      );

      forkJoin(historyRequests).subscribe(histories => {
        const series: any[] = [];
        let dates: string[] = [];

        histories.forEach((history, index) => {
          const coin = topCoins[index];
          const prices = history.prices.map((p: [number, number]) => p[1]);

          if (index === 0) {
            dates = history.prices.map((p: [number, number]) =>
              new Date(p[0]).toLocaleDateString('uk-UA')
            );
          }

          series.push({
            name: coin.symbol.toUpperCase(),
            type: 'line' as const,
            data: prices,
            markPoint: {
              data: [
                { type: 'max' as const, name: 'Макс' },
                { type: 'min' as const, name: 'Мін' }
              ]
            }
          });
        });

        this.cryptoOptions = this.buildLineChartOptions(
          series,
          dates,
          'Top 5 Crypto: Ціна за останні 7 днів'
        );
      });
    });
  }

  /** ---------- TOP STOCKS ---------- */
  private loadTopStocks(): void {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

    const requests = symbols.map(symbol =>
      this.http.get<any>(
        `https://yahoo-finance15.p.rapidapi.com/api/yahoo/hi/history/${symbol}/5d`,
        { headers: this.rapidApiHeaders }
      )
    );

    forkJoin(requests).subscribe(results => {
      const series: any[] = [];
      let dates: string[] = [];

      results.forEach((res, index) => {
        const items: any = res?.body?.items || {};
        if (Object.keys(items).length === 0) return;

        const sortedEntries = Object.entries(items)
          .sort(([, a]: [string, any], [, b]: [string, any]) => a.date - b.date);

        const prices = sortedEntries.map(([, item]: [string, any]) =>
          item.close ?? item.adjclose ?? 0
        );

        if (index === 0) {
          dates = sortedEntries.map(([, item]: [string, any]) =>
            new Date(item.date * 1000).toLocaleDateString('uk-UA')
          );
        }

        series.push({
          name: symbols[index],
          type: 'line' as const,
          data: prices,
          markPoint: {
            data: [
              { type: 'max' as const, name: 'Макс' },
              { type: 'min' as const, name: 'Мін' }
            ]
          }
        });
      });

      this.stockOptions = this.buildLineChartOptions(
        series,
        dates,
        'Top Stocks: Ціна за останні 5 торгових днів'
      );
    }, err => {
      console.error('Помилка завантаження стоків:', err);
    });
  }

  /** ---------- SEARCH CRYPTO ---------- */
  searchCrypto(): void {
    if (!this.cryptoSearchSymbol.trim()) return;

    const symbol = this.cryptoSearchSymbol.trim().toUpperCase();

    this.http.get<any>('https://api.coingecko.com/api/v3/search', {
      params: { query: symbol }
    }).subscribe(searchData => {
      const match = (searchData.coins || []).find((c: any) => c.symbol.toUpperCase() === symbol);

      if (!match) {
        alert('Криптовалюту не знайдено');
        return;
      }

      this.http.get<any>(`https://api.coingecko.com/api/v3/coins/${match.id}/market_chart`, {
        params: { vs_currency: 'usd', days: '7' }
      }).subscribe(history => {
        const prices = history.prices.map((p: [number, number]) => p[1]);
        const dates = history.prices.map((p: [number, number]) =>
          new Date(p[0]).toLocaleDateString('uk-UA')
        );

        const series = [{
          name: symbol,
          type: 'line' as const,
          data: prices,
          markPoint: {
            data: [
              { type: 'max' as const, name: 'Макс' },
              { type: 'min' as const, name: 'Мін' }
            ]
          }
        }];

        this.searchOptions = this.buildLineChartOptions(
          series,
          dates,
          `${match.name} (${symbol}): Ціна за останні 7 днів`
        );
      });
    });
  }

  /** ---------- SEARCH STOCK ---------- */
  searchStock(): void {
    if (!this.stockSearchSymbol.trim()) return;

    const symbol = this.stockSearchSymbol.trim().toUpperCase();

    this.http.get<any>(
      `https://yahoo-finance15.p.rapidapi.com/api/yahoo/hi/history/${symbol}/5d`,
      { headers: this.rapidApiHeaders }
    ).subscribe(res => {
      const items: any = res?.body?.items || {};
      if (Object.keys(items).length === 0) {
        alert('Сток не знайдено або немає історичних даних');
        return;
      }

      const sortedEntries = Object.entries(items)
        .sort(([, a]: [string, any], [, b]: [string, any]) => a.date - b.date);

      const prices = sortedEntries.map(([, item]: [string, any]) =>
        item.close ?? item.adjclose ?? 0
      );

      const dates = sortedEntries.map(([, item]: [string, any]) =>
        new Date(item.date * 1000).toLocaleDateString('uk-UA')
      );

      const series = [{
        name: symbol,
        type: 'line' as const,
        data: prices,
        markPoint: {
          data: [
            { type: 'max' as const, name: 'Макс' },
            { type: 'min' as const, name: 'Мін' }
          ]
        }
      }];

      this.searchOptions = this.buildLineChartOptions(
        series,
        dates,
        `${symbol}: Ціна за останні 5 торгових днів`
      );
    }, () => {
      alert('Помилка при завантаженні даних стоку');
    });
  }

  /** Універсальний метод для створення line chart */
  private buildLineChartOptions(series: any[], xAxisData: string[], titleText: string): EChartsOption {
    return {
      title: { text: titleText, left: 'center', textStyle: { color: '#fff' } },
      tooltip: { trigger: 'axis' },
      legend: { bottom: 10, textStyle: { color: '#fff' } },
      xAxis: { type: 'category', data: xAxisData, axisLabel: { color: '#fff' } },
      yAxis: { type: 'value', axisLabel: { color: '#fff' } },
      series,
      backgroundColor: 'transparent'
    };
  }

}
