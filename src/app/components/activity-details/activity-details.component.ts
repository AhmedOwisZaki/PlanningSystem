import { Component, computed, inject, signal, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningService } from '../../services/planning.service';
import { Resource } from '../../models/planning.models';

@Component({
    selector: 'app-activity-details',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './activity-details.component.html',
    styleUrls: ['./activity-details.component.scss']
})
export class ActivityDetailsComponent implements OnDestroy {
    private planningService = inject(PlanningService);

    // Selected activity (from service)
    selectedActivity = this.planningService.selectedActivity;

    // Details panel resize state
    detailsPanelHeight = signal(160); // Default height in pixels
    activeTab = signal<'general' | 'resources' | 'relationships' | 'steps' | 'cost' | 'codes'>('general');

    // Resources from service
    resources = this.planningService.resources;

    // Calendars from service
    calendars = computed(() => this.planningService.state().calendars || []);

    isBaselineApplied = this.planningService.isBaselineApplied;

    // Relationship Logic
    predecessors = computed(() => {
        const act = this.selectedActivity();
        return act ? this.planningService.getPredecessors(act.id) : [];
    });

    successors = computed(() => {
        const act = this.selectedActivity();
        return act ? this.planningService.getSuccessors(act.id) : [];
    });

    private isResizingPanel = false;
    private resizeStartY = 0;
    private resizeStartHeight = 0;
    private minPanelHeight = 50;



    ngOnDestroy() {
        // Ensure listeners are removed if component is destroyed
        this.removeResizeListeners();
    }

    getActivityName(id: number): string {
        const act = this.planningService.activities().find(a => a.id === id);
        return act ? act.name : 'Unknown';
    }

    onNameChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        if (this.selectedActivity() && value.trim()) {
            this.planningService.updateActivity({ ...this.selectedActivity()!, name: value });
        }
    }

    onDurationChange(event: Event) {
        const value = parseInt((event.target as HTMLInputElement).value, 10);
        if (this.selectedActivity() && !isNaN(value) && value > 0) {
            this.planningService.updateActivity({ ...this.selectedActivity()!, duration: value });
        }
    }

    onTypeChange(event: Event) {
        const value = (event.target as HTMLSelectElement).value as any;
        if (this.selectedActivity()) {
            this.planningService.updateActivityType(this.selectedActivity()!.id, value);
        }
    }

    onCalendarChange(event: Event) {
        const value = parseInt((event.target as HTMLSelectElement).value, 10);
        if (this.selectedActivity() && !isNaN(value)) {
            this.planningService.updateActivity({
                ...this.selectedActivity()!,
                calendarId: value
            });
        }
    }

    onActualStartChange(val: string) {
        if (this.selectedActivity()) {
            this.planningService.updateActivity({
                ...this.selectedActivity()!,
                actualStart: val ? new Date(val) : undefined
            });
        }
    }

    onActualFinishChange(val: string) {
        if (this.selectedActivity()) {
            this.planningService.updateActivity({
                ...this.selectedActivity()!,
                actualFinish: val ? new Date(val) : undefined
            });
        }
    }

    onBaselineStartChange(val: string) {
        if (this.selectedActivity()) {
            this.planningService.updateActivity({
                ...this.selectedActivity()!,
                baselineStartDate: val ? new Date(val) : undefined
            });
        }
    }

    onBaselineFinishChange(val: string) {
        if (this.selectedActivity()) {
            this.planningService.updateActivity({
                ...this.selectedActivity()!,
                baselineEndDate: val ? new Date(val) : undefined
            });
        }
    }

    updateLag(depId: number, event: Event) {
        const input = event.target as HTMLInputElement;
        const lag = parseInt(input.value, 10);
        if (!isNaN(lag)) {
            this.planningService.updateDependency(depId, { lag });
        }
    }

    deleteDependency(depId: number) {
        if (confirm('Delete relationship?')) {
            this.planningService.removeDependency(depId);
        }
    }

    setActiveTab(tab: 'general' | 'resources' | 'relationships' | 'steps' | 'cost' | 'codes') {
        this.activeTab.set(tab);
    }

    getResourceName(resourceId: number): string {
        const resources = this.resources() || [];
        const res = resources.find((r: Resource) => r.id === resourceId);
        return res ? res.name : 'Unknown Resource';
    }

    getResourceUnit(resourceId: number): string {
        const resources = this.resources() || [];
        const res = resources.find((r: Resource) => r.id === resourceId);
        return res ? res.unit : '';
    }

    getResourceCost(resourceId: number): number {
        const resources = this.resources() || [];
        const res = resources.find((r: Resource) => r.id === resourceId);
        return res ? res.costPerUnit : 0;
    }

    // Resource Assignment
    isAssigningResource = false;
    newAssignment = {
        resourceId: null as number | null,
        amount: 1
    };

    startAssignResource() {
        this.isAssigningResource = true;
        this.newAssignment = { resourceId: null, amount: 1 };
    }

    cancelAssignResource() {
        this.isAssigningResource = false;
    }

    saveResourceAssignment() {
        const activity = this.selectedActivity();
        console.log('Saving resource assignment:', {
            activityId: activity?.id,
            resourceId: this.newAssignment.resourceId,
            amount: this.newAssignment.amount
        });
        if (activity && this.newAssignment.resourceId !== null && this.newAssignment.amount > 0) {
            this.planningService.assignResourceToActivity(
                activity.id,
                this.newAssignment.resourceId,
                this.newAssignment.amount
            );
            this.isAssigningResource = false;
        } else {
            console.warn('Assignment validation failed:', {
                hasActivity: !!activity,
                resourceId: this.newAssignment.resourceId,
                amount: this.newAssignment.amount
            });
        }
    }

    // Resource Item Editing
    editingResourceItemId = signal<number | null>(null);
    editAmount = 0; // Riverside: changed editAmount to regular property

    startEditResourceItem(item: any) {
        this.editingResourceItemId.set(item.id);
        this.editAmount = item.amount;
    }

    cancelResourceItemEdit() {
        this.editingResourceItemId.set(null);
    }

    saveResourceItemEdit() {
        const itemId = this.editingResourceItemId();
        const activityId = this.selectedActivity()?.id;
        const amount = Number(this.editAmount);

        console.log('Component: saveResourceItemEdit', { itemId, activityId, amount });

        if (itemId !== null && activityId !== undefined && !isNaN(amount) && amount > 0) {
            this.planningService.updateResourceAssignment(activityId, itemId, amount);
            this.editingResourceItemId.set(null);
        } else {
            console.warn('Component: saveResourceItemEdit validation failed', { itemId, activityId, amount });
        }
    }

    deleteResourceItem(item: any) {
        if (confirm(`Remove resource ${this.getResourceName(item.resourceId)}?`)) {
            const activityId = this.selectedActivity()?.id;
            if (activityId !== undefined) {
                this.planningService.removeResourceAssignment(activityId, item.id);
            }
        }
    }

    @Output() close = new EventEmitter<void>();

    closeDetailsPanel() {
        this.planningService.setSelectedActivity(null);
        this.isAssigningResource = false;
        this.close.emit();
    }

    getEndDate(activity: any): Date {
        const endDate = new Date(activity.startDate);
        endDate.setDate(endDate.getDate() + activity.duration - 1);
        return endDate;
    }

    getVariance(activity: any): number {
        if (!activity.baselineStartDate) return 0;
        const start = new Date(activity.startDate);
        const baseline = new Date(activity.baselineStartDate);
        const diff = start.getTime() - baseline.getTime();
        return Math.round(diff / (1000 * 3600 * 24));
    }

    // Steps Logic
    newStepName = '';
    newStepWeight = 1;

    addStep() {
        if (this.selectedActivity() && this.newStepName.trim()) {
            this.planningService.addActivityStep(
                this.selectedActivity()!.id,
                this.newStepName,
                this.newStepWeight
            );
            this.newStepName = '';
            this.newStepWeight = 1;
        }
    }

    removeStep(stepId: number) {
        if (this.selectedActivity()) {
            this.planningService.removeActivityStep(this.selectedActivity()!.id, stepId);
        }
    }

    toggleStep(stepId: number) {
        if (this.selectedActivity()) {
            this.planningService.toggleActivityStep(this.selectedActivity()!.id, stepId);
        }
    }

    onEarningTypeChange(event: Event) {
        const type = (event.target as HTMLSelectElement).value as any;
        if (this.selectedActivity()) {
            this.planningService.updateEarningType(this.selectedActivity()!.id, type);
        }
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
        const availableHeight = window.innerHeight - 100; // Leave some space for header

        const newHeight = Math.max(
            this.minPanelHeight,
            Math.min(availableHeight, this.resizeStartHeight + deltaY)
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

    onBudgetChange(event: Event) {
        const value = parseFloat((event.target as HTMLInputElement).value);
        if (this.selectedActivity() && !isNaN(value)) {
            this.planningService.updateActivity({
                ...this.selectedActivity()!,
                budgetAtCompletion: value
            });
        }
    }

    onActualCostChange(event: Event) {
        const value = parseFloat((event.target as HTMLInputElement).value);
        if (this.selectedActivity() && !isNaN(value)) {
            this.planningService.updateActivity({
                ...this.selectedActivity()!,
                actualCost: value
            });
        }
    }

    // Codes from service
    codeDefinitions = computed(() => this.planningService.state().activityCodeDefinitions || []);

    onCodeChange(defId: number, event: Event) {
        const valId = parseInt((event.target as HTMLSelectElement).value, 10);
        const actId = this.selectedActivity()?.id;
        if (actId) {
            if (!isNaN(valId)) {
                this.planningService.assignActivityCode(actId, defId, valId);
            } else {
                // Handle unassign (e.g. value is "null" or empty)
                this.planningService.assignActivityCode(actId, defId, null);
            }
        }
    }

    getAssignedValue(defId: number): number | 'null' {
        const act = this.selectedActivity();
        if (!act || !act.assignedCodes) return 'null';
        const val = act.assignedCodes[defId];
        return val !== undefined ? val : 'null';
    }

    getCodeColor(defId: number): string {
        const valId = this.getAssignedValue(defId);
        if (valId === 'null') return 'transparent';

        const def = this.codeDefinitions().find(d => d.id === defId);
        if (!def) return 'transparent';

        const val = def.values.find(v => v.id === valId);
        return val ? (val.color || 'transparent') : 'transparent';
    }
}
