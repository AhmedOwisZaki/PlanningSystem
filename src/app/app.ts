import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GanttChartToolBarComponent } from './components/gantt-chart-tool-bar/gantt-chart-tool-bar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GanttChartToolBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('PlanningSystem');
}
