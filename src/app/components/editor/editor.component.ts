import { Component, inject, computed, signal, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningService } from '../../services/planning.service';
import { Resource, Calendar } from '../../models/planning.models';
import { XerExporterService } from '../../services/xer-exporter.service';
import { SCurvesChartComponent } from '../s-curves-chart/s-curves-chart.component';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, SCurvesChartComponent],
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss']
})
export class EditorComponent {
    planningService = inject(PlanningService);
    xerExporter = inject(XerExporterService);
    el = inject(ElementRef);

    activeTab: 'project' | 'resources' | 'calendars' | 'codes' = 'resources';
    resources = this.planningService.resources;
    resourceTypes = this.planningService.resourceTypes;

    // Project dates for chart
    projectStartDate = this.planningService.projectStartDate;
    projectEndDate = this.planningService.projectEndDate;
    activities = this.planningService.activities;
    projectState = this.planningService.state; // Needed for profile component
    projectName = computed(() => this.planningService.state().projectName || 'Current Project');

    // Calendars
    calendars = computed(() => this.planningService.state().calendars || []);

    // Activity Codes
    codeDefinitions = computed(() => this.planningService.state().activityCodeDefinitions || []);
    selectedCodeDef = signal<any | null>(null);
    newCodeDefName = signal('');
    newCodeValue = signal('');
    newCodeColor = signal('#339af0');

    // UI state for operations
    isSaving = signal(false);
    saveError = signal<string | null>(null);



    // Calendar Management State
    editingCalendar = signal<Calendar | null>(null);
    isNewCalendar = signal(false);
    newHolidayDate = signal<string>(''); // YYYY-MM-DD string from input

    // S-Curves Modal
    showSCurves = signal(false);

    resourcesByType = computed(() => {
        const types = this.resourceTypes() || [];
        const allResources = this.resources() || [];
        return types.map(type => ({
            ...type,
            resources: allResources.filter(r => r.resourceTypeId === type.id)
        }));
    });

    showAddResourceForm = false;
    newResource: Partial<Resource> = {
        name: '',
        unit: 'hour',
        costPerUnit: 0,
        resourceTypeId: 1
    };
    resourceBaseType: 'daily' | 'hourly' = 'hourly';

    expandedCategories = signal<Set<number>>(new Set([1, 2, 3]));
    selectedResource = signal<Resource | null>(null);
    showProfile = signal(false);

    // Resource Type management
    isManagingResourceTypes = signal(false);
    isViewingAllAssignments = signal(false);
    editingResourceType = signal<any | null>(null);
    newResourceTypeData = { name: '', description: '' };

    allAssignments = computed(() => {
        const activities = this.activities() || [];
        const resources = this.resources() || [];
        const resMap = new Map(resources.map(r => [r.id, r]));

        const assignments: any[] = [];
        activities.forEach(activity => {
            if (activity.resourceItems && activity.resourceItems.length > 0) {
                activity.resourceItems.forEach((item: any) => {
                    const resource = resMap.get(item.resourceId);
                    assignments.push({
                        ...item,
                        activityName: activity.name,
                        resourceName: resource ? resource.name : 'Unknown Resource',
                        unit: resource ? resource.unit : '-'
                    });
                });
            }
        });
        // Sort by resource name or activity name? Let's go with resource name.
        return assignments.sort((a, b) => a.resourceName.localeCompare(b.resourceName));
    });

    @Output() requestOpenProfile = new EventEmitter<Resource>();
    @Output() requestOpenSCurves = new EventEmitter<void>();

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (!this.isManagingResourceTypes()) return;

        const target = event.target as HTMLElement;
        const clickedInside = this.el.nativeElement.querySelector('.resource-types-editor')?.contains(target);
        const clickedToggleButton = target.closest('.btn-manage-types');

        if (!clickedInside && !clickedToggleButton) {
            this.isManagingResourceTypes.set(false);
            this.editingResourceType.set(null);
        }
    }

    toggleTab(tab: 'project' | 'resources' | 'calendars' | 'codes') {
        this.activeTab = tab;
        this.selectedResource.set(null); // Clear selection when switching tabs if desired
        this.showProfile.set(false);
        this.isViewingAllAssignments.set(false);
    }

    selectResource(resource: Resource, event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        this.selectedResource.set(resource);
    }

    deselectResource() {
        this.selectedResource.set(null);
        this.showProfile.set(false);
    }

    openProfile(event: Event) {
        event.stopPropagation();
        const res = this.selectedResource();
        if (res) {
            this.requestOpenProfile.emit(res);
        }
    }

    closeProfile() {
        this.showProfile.set(false);
    }

    printProfile() {
        window.print();
    }


    toggleCategory(typeId: number) {
        const current = new Set(this.expandedCategories());
        if (current.has(typeId)) {
            current.delete(typeId);
        } else {
            current.add(typeId);
        }
        this.expandedCategories.set(current);
    }

    isCategoryExpanded(typeId: number) {
        return this.expandedCategories().has(typeId);
    }

    startAddResource() {
        const types = this.resourceTypes();
        const firstTypeId = types && types.length > 0 ? types[0].id : 1;
        this.resourceBaseType = 'hourly';
        this.newResource = {
            name: '',
            unit: 'hour',
            costPerUnit: 0,
            resourceTypeId: firstTypeId,
            isDailyBasedResource: false,
            isHourlyBasedResource: true,
            maxAvailabilityUnitsPerDay: 8,
            maxAvailabilityUnitsPerHour: 1
        };
        this.showAddResourceForm = true;
    }

    cancelAddResource() {
        this.showAddResourceForm = false;
    }

    editResource(resource: Resource) {
        this.newResource = {
            ...resource,
            projectId: resource.projectId || this.planningService.state().projectId
        };
        // Determine base type logic for radio
        if (this.newResource.isDailyBasedResource) {
            this.resourceBaseType = 'daily';
        } else {
            this.resourceBaseType = 'hourly';
        }
        this.showAddResourceForm = true;
    }

    saveNewResource() {
        if (this.newResource.name && this.newResource.resourceTypeId) {
            if (!this.newResource.projectId) {
                this.newResource.projectId = this.planningService.state().projectId;
            }

            // Sync boolean flags with radio selection
            this.newResource.isDailyBasedResource = this.resourceBaseType === 'daily';
            this.newResource.isHourlyBasedResource = this.resourceBaseType === 'hourly';

            // Ensure numbers are numbers
            if (this.newResource.maxAvailabilityUnitsPerDay) this.newResource.maxAvailabilityUnitsPerDay = Number(this.newResource.maxAvailabilityUnitsPerDay);
            if (this.newResource.maxAvailabilityUnitsPerHour) this.newResource.maxAvailabilityUnitsPerHour = Number(this.newResource.maxAvailabilityUnitsPerHour);

            if (this.newResource.id) {
                this.planningService.updateResource(this.newResource);
            } else {
                this.planningService.addResource(this.newResource);
            }
            this.showAddResourceForm = false;
        }
    }

    deleteResource(resource: Resource, event: MouseEvent) {
        event.stopPropagation();
        if (confirm(`Are you sure you want to delete resource "${resource.name}"? This will also remove it from all activity assignments.`)) {
            this.planningService.deleteResource(resource.id);
        }
    }

    // Resource Type management methods
    toggleManageResourceTypes() {
        this.isManagingResourceTypes.set(!this.isManagingResourceTypes());
        this.editingResourceType.set(null);
        if (this.isManagingResourceTypes()) {
            this.isViewingAllAssignments.set(false);
        }
    }

    toggleViewingAllAssignments() {
        this.isViewingAllAssignments.set(!this.isViewingAllAssignments());
        if (this.isViewingAllAssignments()) {
            this.isManagingResourceTypes.set(false);
            this.selectedResource.set(null);
        }
    }

    startAddResourceType() {
        this.editingResourceType.set({ id: 0, name: '', description: '', projectId: this.planningService.state().projectId });
    }

    editResourceType(type: any) {
        this.editingResourceType.set({ ...type });
    }

    cancelEditResourceType() {
        this.editingResourceType.set(null);
    }

    saveResourceType() {
        const type = this.editingResourceType();
        if (!type || !type.name) return;

        this.isSaving.set(true);
        const obs = type.id === 0
            ? this.planningService.addResourceType(type)
            : this.planningService.updateResourceType(type);

        obs.subscribe({
            next: () => {
                this.isSaving.set(false);
                this.editingResourceType.set(null);
            },
            error: (err) => {
                this.isSaving.set(false);
                this.saveError.set(err.message || 'Failed to save resource type.');
            }
        });
    }

    deleteResourceType(id: number) {
        if (confirm('Are you sure you want to delete this resource type? Resources of this type will be unassigned.')) {
            this.planningService.deleteResourceType(id).subscribe({
                error: (err) => alert(err.message || 'Failed to delete resource type.')
            });
        }
    }

    exportToXER() {
        const projectState = this.planningService.state();
        const filename = `${projectState.projectName || 'project'}.xer`;
        this.xerExporter.downloadXER(projectState, filename);
    }

    getWorkDaysText(workDays: boolean[]): string {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const workingDays = days.filter((_, i) => workDays[i]);
        return workingDays.join(', ');
    }

    openSCurves() {
        console.log('openSCurves called - requesting floating window');
        this.requestOpenSCurves.emit();
    }

    closeSCurves() {
        this.showSCurves.set(false);
    }

    setBaseline() {
        if (confirm('Set current schedule as the project baseline? This will overwrite any existing baseline.')) {
            this.planningService.assignBaseline();
        }
    }

    levelResources() {
        if (confirm('Level resources? This will delay activities based on resource availability limits.')) {
            this.planningService.levelResources();
        }
    }

    // Calendar Methods
    startAddCalendar() {
        const newCal: Calendar = {
            id: 0, // Temp ID
            name: 'New Calendar',
            isDefault: false,
            workDays: [false, true, true, true, true, true, false],
            workHoursPerDay: 8,
            holidays: [],
            projectId: this.planningService.state().projectId
        };
        this.editingCalendar.set(newCal);
        this.isNewCalendar.set(true);
    }

    editCalendar(cal: Calendar) {
        // Deep copy to avoid mutating state directly
        const copy: Calendar = {
            ...cal,
            workDays: [...cal.workDays],
            holidays: [...cal.holidays]
        };
        this.editingCalendar.set(copy);
        this.isNewCalendar.set(false);
    }

    saveCalendar() {
        const cal = this.editingCalendar();
        if (!cal) return;

        this.isSaving.set(true);
        this.saveError.set(null);

        const obs = this.isNewCalendar()
            ? this.planningService.addCalendar(cal)
            : this.planningService.updateCalendar(cal);

        obs.subscribe({
            next: () => {
                this.isSaving.set(false);
                this.editingCalendar.set(null);
            },
            error: (err) => {
                this.isSaving.set(false);
                this.saveError.set(err.message || 'Failed to save calendar. Please check your connection and try again.');
                console.error('Save failed:', err);
            }
        });
    }

    cancelEditCalendar() {
        this.editingCalendar.set(null);
    }

    deleteCalendar(calId: number) {
        if (confirm('Are you sure you want to delete this calendar? Activities using it will be reset to default.')) {
            this.planningService.deleteCalendar(calId);
        }
    }

    toggleWorkDay(index: number) {
        const cal = this.editingCalendar();
        if (cal) {
            const days = [...cal.workDays];
            days[index] = !days[index];
            this.editingCalendar.set({ ...cal, workDays: days });
        }
    }

    addHoliday() {
        const cal = this.editingCalendar();
        const dateStr = this.newHolidayDate();
        if (cal && dateStr) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                // Determine if already exists
                const exists = cal.holidays.some(h => new Date(h).toDateString() === date.toDateString());
                if (!exists) {
                    this.editingCalendar.set({
                        ...cal,
                        holidays: [...cal.holidays, date]
                    });
                    this.newHolidayDate.set('');
                }
            }
        }
    }

    removeHoliday(index: number) {
        const cal = this.editingCalendar();
        if (cal) {
            const hols = cal.holidays.filter((_, i) => i !== index);
            this.editingCalendar.set({ ...cal, holidays: hols });
        }
    }

    // Activity Code Definition Methods
    startAddCodeDef() {
        const name = this.newCodeDefName();
        if (name) {
            this.planningService.addActivityCodeDefinition(name);
            this.newCodeDefName.set('');
        }
    }

    deleteCodeDef(id: number) {
        if (confirm('Delete this code definition? Details will be lost.')) {
            this.planningService.deleteActivityCodeDefinition(id);
            this.selectedCodeDef.set(null);
        }
    }

    selectCodeDef(def: any) {
        this.selectedCodeDef.set(def);
    }

    addCodeValue() {
        const def = this.selectedCodeDef();
        const val = this.newCodeValue();
        const color = this.newCodeColor();
        if (def && val) {
            this.planningService.addActivityCodeValue(def.id, val, color);
            this.newCodeValue.set('');
            // No need to manually update selectedCodeDef as it is a reference, but if list works by computed it might update.
            // Ideally we re-fetch the latest def from signal.
            // For now, let's just clear inputs.
        }
    }

    deleteCodeValue(defId: number, valId: number) {
        if (confirm('Delete this value?')) {
            this.planningService.deleteActivityCodeValue(defId, valId);
        }
    }
}
