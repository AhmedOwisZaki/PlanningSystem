import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanningService } from '../../services/planning.service';

@Component({
    selector: 'app-activity-details',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './activity-details.component.html',
    styleUrls: ['./activity-details.component.scss']
})
export class ActivityDetailsComponent implements OnDestroy {
    private planningService = inject(PlanningService);

    // Selected activity (from service)
    selectedActivity = this.planningService.selectedActivity;

    // Details panel resize state
    detailsPanelHeight = signal(200); // Default height in pixels
    private isResizingPanel = false;
    private resizeStartY = 0;
    private resizeStartHeight = 0;
    private minPanelHeight = 100;
    private maxPanelHeight = 600;

    ngOnDestroy() {
        // Ensure listeners are removed if component is destroyed
        this.removeResizeListeners();
    }

    closeDetailsPanel() {
        this.planningService.setSelectedActivity(null);
    }

    getEndDate(activity: any): Date {
        const endDate = new Date(activity.startDate);
        endDate.setDate(endDate.getDate() + activity.duration - 1);
        return endDate;
    }

    // Details Panel Resize Handlers
    onPanelResizeStart(event: MouseEvent) {
        event.preventDefault();
        this.isResizingPanel = true;
        this.resizeStartY = event.clientY;
        this.resizeStartHeight = this.detailsPanelHeight();

        document.addEventListener('mousemove', this.onPanelResize);
        document.addEventListener('mouseup', this.onPanelResizeEnd);
    }

    private onPanelResize = (event: MouseEvent) => {
        if (!this.isResizingPanel) return;

        const deltaY = this.resizeStartY - event.clientY; // Inverted: drag up = increase height
        const newHeight = Math.max(
            this.minPanelHeight,
            Math.min(this.maxPanelHeight, this.resizeStartHeight + deltaY)
        );

        this.detailsPanelHeight.set(newHeight);
    }

    private onPanelResizeEnd = () => {
        if (this.isResizingPanel) {
            this.isResizingPanel = false;
            this.removeResizeListeners();
        }
    }

    private removeResizeListeners() {
        document.removeEventListener('mousemove', this.onPanelResize);
        document.removeEventListener('mouseup', this.onPanelResizeEnd);
    }
}
