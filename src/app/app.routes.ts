import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AboutComponent } from './pages/about/about.component';
import { CompareComponent } from './pages/compareAssets/compare.component';
import { OverviewComponent } from './pages/marketOverview/marketOverview.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'about', component: AboutComponent },
  { path: 'compare', component: CompareComponent },
  { path: 'overview', component: OverviewComponent },
];
