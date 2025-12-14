import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningService } from '../../services/planning.service';
import { Resource } from '../../models/planning.models';
import { ResourceUsageChartComponent } from '../resource-usage-chart/resource-usage-chart.component';
import { XerExporterService } from '../../services/xer-exporter.service';
import { SCurvesChartComponent } from '../s-curves-chart/s-curves-chart.component';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, ResourceUsageChartComponent, SCurvesChartComponent],
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss']
})
export class EditorComponent {
    planningService = inject(PlanningService);
    xerExporter = inject(XerExporterService);

    activeTab: 'project' | 'resources' | 'calendars' = 'resources';
    resources = this.planningService.resources;
    resourceTypes = this.planningService.resourceTypes;

    // Project dates for chart
    projectStartDate = this.planningService.projectStartDate;
    projectEndDate = this.planningService.projectEndDate;
    activities = this.planningService.activities;
    projectName = computed(() => this.planningService.state().projectName || 'Current Project');

    // Calendars
    calendars = computed(() => this.planningService.state().calendars || []);

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

    toggleTab(tab: 'project' | 'resources' | 'calendars') {
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
        this.showProfile.set(true);
    }

    closeProfile() {
        this.showProfile.set(false);
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
}
