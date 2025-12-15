import { Component, inject, computed, signal, Output, EventEmitter } from '@angular/core';
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

    expandedCategories = signal<Set<number>>(new Set([1, 2, 3]));
    selectedResource = signal<Resource | null>(null);
    showProfile = signal(false);

    @Output() requestOpenProfile = new EventEmitter<Resource>();

    toggleTab(tab: 'project' | 'resources' | 'calendars' | 'codes') {
        this.activeTab = tab;
        this.selectedResource.set(null); // Clear selection when switching tabs if desired
        this.showProfile.set(false);
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
        this.newResource = { name: '', unit: 'hour', costPerUnit: 0, resourceTypeId: 1 };
        this.showAddResourceForm = true;
    }

    cancelAddResource() {
        this.showAddResourceForm = false;
    }

    saveNewResource() {
        if (this.newResource.name && this.newResource.resourceTypeId) {
            this.planningService.addResource(this.newResource);
            this.showAddResourceForm = false;
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
        this.showSCurves.set(true);
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
            holidays: []
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

        if (this.isNewCalendar()) {
            this.planningService.addCalendar(cal);
        } else {
            this.planningService.updateCalendar(cal);
        }
        this.editingCalendar.set(null);
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
