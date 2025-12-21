import { Component, computed, inject, signal, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningService } from '../../services/planning.service';

@Component({
    selector: 'app-dependency-details',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dependency-details.component.html',
    styleUrls: ['./dependency-details.component.scss']
})
export class DependencyDetailsComponent {
    private planningService = inject(PlanningService);

    // Selected dependency (from service)
    selectedDependency = this.planningService.selectedDependency;

    // Panel height (can reuse same logic as activity details)
    panelHeight = signal(160);

    // Helper to get activity name
    getActivityName(id: number): string {
        const act = this.planningService.activities().find(a => a.id === id);
        return act ? act.name : `Activity ${id}`;
    }

    onLagChange(event: Event) {
        const value = parseInt((event.target as HTMLInputElement).value, 10);
        const dep = this.selectedDependency();
        if (dep && !isNaN(value)) {
            this.planningService.updateDependency(dep.id, { lag: value });
        }
    }

    onTypeChange(event: Event) {
        const value = (event.target as HTMLSelectElement).value as any;
        const dep = this.selectedDependency();
        if (dep && value) {
            this.planningService.updateDependency(dep.id, { type: value });
        }
    }

    @Output() close = new EventEmitter<void>();

    closeDetails() {
        this.planningService.setSelectedDependency(null);
        this.close.emit();
    }

    deleteDependency() {
        const dep = this.selectedDependency();
        if (dep && confirm('Are you sure you want to delete this dependency?')) {
            this.planningService.removeDependency(dep.id);
            this.closeDetails();
        }
    }

    // Resize logic
    private isResizing = false;
    private startY = 0;
    private startHeight = 0;

    onResizeStart(event: MouseEvent) {
        event.preventDefault();
        this.isResizing = true;
        this.startY = event.clientY;
        this.startHeight = this.panelHeight();

        const onMove = (e: MouseEvent) => {
            if (!this.isResizing) return;
            const deltaY = this.startY - e.clientY;
            this.panelHeight.set(Math.max(100, this.startHeight + deltaY));
        };

        const onEnd = () => {
            this.isResizing = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    }
}
