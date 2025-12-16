import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, Event } from '@angular/router';
import { GanttChartToolBarComponent } from './components/gantt-chart-tool-bar/gantt-chart-tool-bar.component';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GanttChartToolBarComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('PlanningSystem');
  protected isWelcomePage = signal(false);

  constructor(private router: Router) { }

  ngOnInit() {
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isWelcomePage.set(
        event.url === '/' ||
        event.url === '/welcome' ||
        event.urlAfterRedirects === '/' ||
        event.urlAfterRedirects === '/welcome'
      );
    });
  }
}
