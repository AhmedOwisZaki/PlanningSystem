import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningService } from '../../services/planning.service';
import { Resource } from '../../models/planning.models';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="editor-panel">
            <!-- Tab Navigation -->
            <div class="editor-tabs">
                <div class="tab" [class.active]="activeTab === 'project'" (click)="toggleTab('project')">Project</div>
                <div class="tab" [class.active]="activeTab === 'resources'" (click)="toggleTab('resources')">Resources</div>
            </div>

            <!-- Tab Content -->
            <div class="editor-content">
                <!-- PROJECT TAB -->
                <div *ngIf="activeTab === 'project'" class="tab-pane">
                    <p style="padding: 10px; color: #666;">Project details placeholder.</p>
                </div>

                <!-- RESOURCES TAB -->
                <div *ngIf="activeTab === 'resources'" class="tab-pane resources-pane">
                    <!-- Header -->
                    <div class="resources-header">
                        <h3>All Resources</h3>
                        <button class="btn-add" (click)="startAddResource()" *ngIf="!showAddResourceForm">+</button>
                    </div>

                    <!-- Add Resource Form -->
                    <div class="add-resource-form" *ngIf="showAddResourceForm">
                        <h4>New Resource</h4>
                        <div class="form-row">
                            <input type="text" [(ngModel)]="newResource.name" placeholder="Name" class="form-control">
                        </div>
                        <div class="form-row">
                            <select [(ngModel)]="newResource.resourceTypeId" class="form-control">
                                <option *ngFor="let type of resourceTypes()" [ngValue]="type.id">{{ type.name }}</option>
                            </select>
                        </div>
                        <div class="form-row" style="display: flex; gap: 5px;">
                            <input type="number" [(ngModel)]="newResource.costPerUnit" placeholder="Cost" class="form-control">
                            <input type="text" [(ngModel)]="newResource.unit" placeholder="Unit" class="form-control">
                        </div>
                        <div class="form-actions">
                            <button (click)="cancelAddResource()" class="btn-cancel">Cancel</button>
                            <button (click)="saveNewResource()" class="btn-save">Save</button>
                        </div>
                    </div>

                    <!-- Resource Categories -->
                    <div class="resource-categories">
                        <div class="category-group" *ngFor="let group of resourcesByType()">
                            <div class="category-header" 
                                 [class.human]="group.name === 'Human'"
                                 [class.machine]="group.name === 'Machine'"
                                 [class.material]="group.name === 'Material'"
                                 (click)="toggleCategory(group.id)">
                                <span class="arrow-icon">{{ isCategoryExpanded(group.id) ? '▼' : '▶' }}</span>
                                <span class="group-name">{{ group.name }}</span>
                                <span class="count-badge">({{ group.resources.length }})</span>
                            </div>

                            <div class="resource-list" *ngIf="isCategoryExpanded(group.id)">
                                <div class="resource-item" *ngFor="let res of group.resources">
                                    <span class="res-name">{{ res.name }}</span>
                                    <span class="res-cost">{{ res.costPerUnit | currency }} / {{ res.unit }}</span>
                                </div>
                                <div *ngIf="group.resources.length === 0" class="no-resources">No items</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; height: 100%; width: 100%; }
        .editor-panel { display: flex; flex-direction: column; height: 100%; width: 100%; background: white; border-left: 1px solid #ccc; box-shadow: -2px 0 5px rgba(0,0,0,0.1); }
        .editor-tabs { display: flex; background: #f1f3f5; height: 48px; border-bottom: 1px solid #dee2e6; flex-shrink: 0; }
        .tab { flex: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #495057; font-weight: 500; border-bottom: 2px solid transparent; user-select: none; }
        .tab:hover { background: #e9ecef; }
        .tab.active { background: white; color: #339af0; border-bottom-color: #339af0; }
        .editor-content { flex: 1; padding: 16px; overflow-y: auto; position: relative; }
        .resources-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #f1f3f5; }
        .resources-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
        .btn-add { width: 32px; height: 32px; border-radius: 50%; background: #339af0; color: white; border: none; font-size: 1.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .btn-add:hover { background: #228be6; }
        .add-resource-form { background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6; margin-bottom: 16px; }
        .form-row { margin-bottom: 8px; }
        .form-control { width: 100%; padding: 6px; border: 1px solid #ced4da; border-radius: 4px; box-sizing: border-box; }
        .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
        .btn-cancel { background: white; border: 1px solid #ced4da; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
        .btn-save { background: #339af0; border: none; color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
        .category-group { margin-bottom: 8px; border: 1px solid #dee2e6; border-radius: 4px; overflow: hidden; }
        .category-header { display: flex; align-items: center; padding: 10px; cursor: pointer; background: white; user-select: none; }
        .category-header:hover { opacity: 0.95; }
        .category-header.human { background: #e7f5ff; border-left: 4px solid #339af0; }
        .category-header.machine { background: #fff4e6; border-left: 4px solid #fd7e14; }
        .category-header.material { background: #ebfbee; border-left: 4px solid #40c057; }
        .arrow-icon { width: 20px; color: #868e96; font-size: 0.8rem; }
        .group-name { flex: 1; font-weight: 600; color: #495057; }
        .count-badge { font-size: 0.8rem; color: #868e96; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 10px; }
        .resource-list { background: white; border-top: 1px solid #f1f3f5; }
        .resource-item { display: flex; justify-content: space-between; padding: 8px 12px 8px 32px; border-bottom: 1px solid #f8f9fa; font-size: 0.9rem; }
        .res-name { color: #212529; }
        .res-cost { color: #868e96; font-size: 0.85rem; }
        .no-resources { padding: 12px; text-align: center; color: #adb5bd; font-style: italic; font-size: 0.9rem; }
    `]
})
export class EditorComponent {
    planningService = inject(PlanningService);
    activeTab: 'project' | 'resources' = 'resources';
    resources = this.planningService.resources;
    resourceTypes = this.planningService.resourceTypes;

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

    toggleTab(tab: 'project' | 'resources') {
        this.activeTab = tab;
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
}
