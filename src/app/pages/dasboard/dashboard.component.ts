import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
    //STATIC DATA FOR EXAMPLE
  popularAssets = [
    { name: 'Bitcoin', symbol: 'BTC', price: 64200 },
    { name: 'Ethereum', symbol: 'ETH', price: 3200 },
    { name: 'Tesla', symbol: 'TSLA', price: 243.55 }
  ];

  marketOverview = [
    { name: 'Bitcoin', symbol: 'BTC', change: 2.3, volume: '25B', risk: 'Low' },
    { name: 'Ethereum', symbol: 'ETH', change: -1.1, volume: '18B', risk: 'Medium' },
    { name: 'NVIDIA', symbol: 'NVDA', change: 4.7, volume: '32B', risk: 'High' }
  ];
}
