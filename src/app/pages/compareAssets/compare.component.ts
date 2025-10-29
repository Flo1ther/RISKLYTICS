import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss']
})
export class CompareComponent {
     assets = [
    {
      name: 'Apple Inc.',
      symbol: 'AAPL',
      type: 'Stock',
      price: 228.16,
      change24h: +1.45,
      volatility: 0.23,
      riskIndex: 42,
      trend: 'up'
    },
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      type: 'Crypto',
      price: 67428.50,
      change24h: -0.87,
      volatility: 0.71,
      riskIndex: 68,
      trend: 'down'
    },
    {
      name: 'Ethereum',
      symbol: 'ETH',
      type: 'Crypto',
      price: 3510.75,
      change24h: +0.52,
      volatility: 0.58,
      riskIndex: 55,
      trend: 'up'
    }
  ];

  sortBy(field: string) {
    this.assets.sort((a: any, b: any) => (a[field] > b[field] ? 1 : -1));
  }
}
