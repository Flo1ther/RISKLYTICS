import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { environment } from '../../environments/environment'

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

  private rapidApiHeaders = new HttpHeaders({
    'x-rapidapi-host': 'yahoo-finance15.p.rapidapi.com',
    'x-rapidapi-key': environment.rapidApiKey
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadTopCrypto();
    this.loadTopStocks();
  }

  /** ---------- CRYPTO (CoinGecko) ---------- */
  private loadTopCrypto(): void {
    this.http.get<any[]>('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: '5',
        page: '1'
      }
    }).subscribe(data => {
      this.cryptoOptions = {
        title: {
          text: 'Top 5 Crypto by Market Cap',
          left: 'center',
          textStyle: { color: '#fff' }
        },
        tooltip: { trigger: 'item' },
        series: [{
          type: 'pie',
          radius: '60%',
          data: data.map(c => ({
            name: c.name,
            value: c.market_cap
          })),
          label: { color: '#fff' }
        }],
        backgroundColor: 'transparent'
      };
    });
  }

  /** ---------- STOCKS (Yahoo Finance via RapidAPI) ---------- */
  private loadTopStocks(): void {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

    const requests = symbols.map(symbol =>
      this.http.get<any>(
        `https://yahoo-finance15.p.rapidapi.com/api/yahoo/qu/quote/${symbol}`,
        {
          headers: this.rapidApiHeaders
        }
      )
    );

    Promise.all(requests.map(r => r.toPromise()))
      .then(results => {
        const data = results.map((res: any, index) => {
          const quote = res?.body?.[0];

          return {
            name: quote?.symbol ?? symbols[index],
            value: quote?.marketCap ?? 0
          };
        });

        console.log('Stocks market cap:', data);

        this.stockOptions = {
          title: {
            text: 'Top Stocks by Market Cap',
            left: 'center',
            textStyle: { color: '#fff' }
          },
          tooltip: {
            trigger: 'item',
            formatter: ({ name, value }: any) =>
              `${name}: ${(value / 1e12).toFixed(2)}T`
          },
          series: [
            {
              type: 'pie',
              radius: '60%',
              data,
              label: { color: '#fff' }
            }
          ],
          backgroundColor: 'transparent'
        };
      })
      .catch(err => {
        console.error('Stock fetch error:', err);
      });
  }

}
