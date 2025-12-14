import { Routes } from '@angular/router';
import { GanttComponent } from './components/gantt/gantt.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { ProjectsPageComponent } from './components/projects-page/projects-page.component';

export const routes: Routes = [
    { path: '', redirectTo: '/welcome', pathMatch: 'full' },
    { path: 'welcome', component: WelcomeComponent },
    { path: 'projects', component: ProjectsPageComponent },
    { path: 'planning', component: GanttComponent }
];
