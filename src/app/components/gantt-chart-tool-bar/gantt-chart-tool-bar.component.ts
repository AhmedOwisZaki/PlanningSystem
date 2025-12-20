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
        const selected = this.selectedActivity();
        let parentId: number | null = null;

        if (selected) {
            // If selecting a WBS, add as child. If selecting a Task, add as sibling.
            parentId = (selected.type === 'WBS') ? selected.id : (selected.parentId || null);
        }

        this.planningService.addActivity(parentId, 'New Activity', false);
    }

    onAddWBS() {
        const selected = this.selectedActivity();
        let parentId: number | null = null;

        if (selected) {
            // If selecting a WBS, add as child. If selecting a Task, add as sibling.
            parentId = (selected.type === 'WBS') ? selected.id : (selected.parentId || null);
        }

        this.planningService.addActivity(parentId, 'New WPS Node', true);
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

    onLevel(event: MouseEvent) {
        // Shift+Click could optionally reset resource limits or clear leveling delays, 
        // but for now let's just trigger leveling. 
        // Perhaps we can add a 'Reset Leveling' feature later which just calls scheduleProject().
        // Actually, let's treat specific shift logic if needed or just call level.
        this.planningService.levelResources();
    }
}
