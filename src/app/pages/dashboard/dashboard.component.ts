import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { lastValueFrom } from 'rxjs';
import * as echarts from 'echarts';
import { environment } from '../../environments/environment'


interface StockData {
  name: string;
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  sparkline: number[];
}

interface TimeSeriesDailyEntry {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

type TimeSeriesDaily = Record<string, TimeSeriesDailyEntry>;

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

  popularStocks: StockData[] = [];
  stockOverview: any[] = [];

  assetChartOptions: { [symbol: string]: EChartsOption } = {};
  stockChartOptions: { [symbol: string]: EChartsOption } = {};

  riskGaugeOption: EChartsOption = {};
  loading = true;

  private alphaVantageApiKey = environment.alphaVantageApiKey;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCryptoData();
    this.loadStockData();
  }

  private loadCryptoData(): void {
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
        this.popularAssets = data.slice(0, 4).map(asset => {
          const sparkline = asset.sparkline_in_7d?.price?.slice(-30) || [];

          return {
            name: asset.name,
            symbol: asset.symbol.toUpperCase(),
            price: asset.current_price,
            sparkline
          };
        });

        this.popularAssets.forEach(asset => {
          this.assetChartOptions[asset.symbol] = this.buildSparklineChart(asset.sparkline, '#409EFF');
        });

        this.marketOverview = data.map(asset => ({
          name: asset.name,
          symbol: asset.symbol.toUpperCase(),
          change: asset.price_change_percentage_24h,
          volume: `$${(asset.total_volume / 1_000_000_000).toFixed(1)}B`,
          risk: this.getRiskLevel(asset.price_change_percentage_24h)
        }));

        this.updateGlobalRisk();
      },
      error: (err) => console.error('Crypto data error:', err)
    });
  }

  private async loadStockData(): Promise<void> {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'FB', 'NVDA', 'NFLX', 'ADBE', 'INTC'];


    try {
      const requests = symbols.map(symbol =>
        lastValueFrom(this.http.get<{ 'Time Series (Daily)': TimeSeriesDaily }>('https://www.alphavantage.co/query', {
          params: {
            function: 'TIME_SERIES_DAILY',
            symbol,
            apikey: this.alphaVantageApiKey
          }
        }))
      );

      const responses = await Promise.all(requests);
      const stocks: StockData[] = [];

      responses.forEach((res, i) => {
        const symbol = symbols[i];
        const daily = res['Time Series (Daily)'];
        if (!daily) return;

        const entries = Object.entries(daily);
        if (!entries.length) return;

        const latest: TimeSeriesDailyEntry = entries[0][1];

        const open = Number(latest['1. open']);
        const high = Number(latest['2. high']);
        const low = Number(latest['3. low']);
        const close = Number(latest['4. close']);
        const volume = Number(latest['5. volume']);

        const sparkline = entries.slice(0, 7).map(([_, val]) => Number(val['4. close'])).reverse();

        stocks.push({
          name: symbol,
          symbol,
          price: close,
          open,
          high,
          low,
          volume,
          sparkline
        });
      });

      this.popularStocks = stocks.slice(0, 4);

      this.popularStocks.forEach(stock => {
        this.stockChartOptions[stock.symbol] = this.buildSparklineChart(stock.sparkline, '#67C23A');
      });

      this.stockOverview = stocks.map(stock => {
        const changePercent = ((stock.price - stock.open) / stock.open) * 100;
        return {
          name: stock.symbol,
          symbol: stock.symbol,
          change: changePercent,
          volume: stock.volume,
          risk: this.getRiskLevel(changePercent)
        };
      });

    } catch (err) {
      console.error('Stock data error:', err);
    } finally {
      this.loading = false;
    }
  }

  private buildSparklineChart(data: number[], color: string, labels?: string[]): EChartsOption {
    const minPrice = Math.min(...data);
    const maxPrice = Math.max(...data);
    const padding = (maxPrice - minPrice) * 0.05;

    return {
      backgroundColor: '#121212',
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => `$${params[0].value.toFixed(2)}`,
        axisPointer: { type: 'cross', lineStyle: { color: '#888' } },
        textStyle: { color: '#fff' },
        backgroundColor: '#222'
      },
      xAxis: {
        type: 'category',
        data: labels || data.map((_, i) => i + 1),
        axisLine: { lineStyle: { color: '#888' } },
        axisLabel: { color: '#aaa' },
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        min: minPrice - padding,
        max: maxPrice + padding,
        axisLine: { lineStyle: { color: '#888' } },
        axisLabel: { color: '#aaa', formatter: (val) => `$${val.toFixed(2)}` },
        splitLine: { lineStyle: { color: '#333' } }
      },
      grid: { left: 30, right: 20, top: 20, bottom: 30 },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { start: 0, end: 100 }
      ],
      series: [
        {
          data: data.map(v => parseFloat(v.toFixed(2))),
          type: 'line',
          smooth: true,
          lineStyle: { color, width: 2 },
          showSymbol: false,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color + '88' },
              { offset: 1, color: color + '11' }
            ])
          },
        }
      ]
    };
  }


  private updateGlobalRisk(): void {
    const valid = this.popularAssets.filter(a => a.sparkline.length > 1);
    const avgRisk = valid.length
      ? valid.reduce((acc, a) =>
          acc + Math.abs(a.sparkline[a.sparkline.length - 1] - a.sparkline[0]), 0
        ) / valid.length
      : 0;

    this.riskGaugeOption = {
      series: [{
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 10,
        detail: { formatter: '{value}' },
        data: [{ value: Math.min(avgRisk * 10, 10), name: 'Risk' }]
      }]
    };
  }

  private getRiskLevel(change: number): string {
    const abs = Math.abs(change);
    if (abs < 1) return 'Low';
    if (abs < 3) return 'Medium';
    return 'High';
  }
}
