import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanningService } from '../../services/planning.service';

@Component({
    selector: 'app-gantt-chart-tool-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './gantt-chart-tool-bar.component.html',
    styleUrls: ['./gantt-chart-tool-bar.component.scss']
})
export class GanttChartToolBarComponent {
    private planningService: PlanningService = inject(PlanningService);

    // Access selected activity from service
    selectedActivity = this.planningService.selectedActivity;

    onAdd() {
        // Add activity at root level
        this.planningService.addActivity(null);
    }

    onDelete() {
        const activity = this.selectedActivity();
        console.log('Delete clicked. Selected activity:', activity);

        if (activity) {
            console.log('Deleting activity with ID:', activity.id);
            this.planningService.deleteActivity(activity.id);
            // Clear selection after deletion
            this.planningService.setSelectedActivity(null);
        } else {
            alert('Please select an activity in the Gantt chart first, then click delete.');
        }
    }

    onUndo() {
        this.planningService.undo();
    }

    onRedo() {
        this.planningService.redo();
    }

    canUndo(): boolean {
        return this.planningService.canUndo();
    }

    canRedo(): boolean {
        return this.planningService.canRedo();
    }

    onSchedule() {
        this.planningService.scheduleProject();
    }

    onBaseline(event: MouseEvent) {
        if (event.shiftKey) {
            this.planningService.clearBaseline();
        } else {
            this.planningService.createBaseline();
        }
    }
}
