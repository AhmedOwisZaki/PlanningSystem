import { Routes } from '@angular/router';
import { GanttComponent } from './components/gantt/gantt.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { ProjectsPageComponent } from './components/projects-page/projects-page.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/welcome', pathMatch: 'full' },
    { path: 'welcome', component: WelcomeComponent },
    { path: 'projects', component: ProjectsPageComponent, canActivate: [authGuard] },
    { path: 'planning', component: GanttComponent, canActivate: [authGuard] },

];
