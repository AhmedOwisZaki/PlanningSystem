import { Routes } from '@angular/router';
import { GanttComponent } from './components/gantt/gantt.component';

export const routes: Routes = [
    { path: '', redirectTo: 'planning', pathMatch: 'full' },
    { path: 'planning', component: GanttComponent }
];
