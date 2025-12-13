import { Routes } from '@angular/router';
import { GanttComponent } from './components/gantt/gantt.component';
import { WelcomeComponent } from './components/welcome/welcome.component';

export const routes: Routes = [
    { path: '', component: WelcomeComponent },
    { path: 'planning', component: GanttComponent }
];
