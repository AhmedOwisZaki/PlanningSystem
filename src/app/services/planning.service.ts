import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { Activity, Dependency, ProjectState } from '../models/planning.models';

@Injectable({
    providedIn: 'root'
})
export class PlanningService {
    // State Signals
    private state: WritableSignal<ProjectState> = signal({
        projectStartDate: new Date('2025-01-01'),
        projectEndDate: new Date('2025-12-31'),
        activities: [
            // Root WBS
            { id: 0, name: 'Total Project', startDate: new Date('2025-01-01'), duration: 320, percentComplete: 35, parentId: null, isExpanded: true },

            // WBS 1: Project Initiation (15 activities)
            { id: 1, name: 'Phase 1: Project Initiation', startDate: new Date('2025-01-01'), duration: 30, percentComplete: 80, parentId: 0, isExpanded: true },
            { id: 2, name: 'Charter Development', startDate: new Date('2025-01-01'), duration: 5, percentComplete: 100, parentId: 1 },
            { id: 3, name: 'Stakeholder Identification', startDate: new Date('2025-01-06'), duration: 3, percentComplete: 100, parentId: 1 },
            { id: 4, name: 'Initial Risk Assessment', startDate: new Date('2025-01-09'), duration: 4, percentComplete: 90, parentId: 1 },
            { id: 5, name: 'Budget Estimation', startDate: new Date('2025-01-13'), duration: 5, percentComplete: 85, parentId: 1 },
            { id: 6, name: 'Resource Planning', startDate: new Date('2025-01-18'), duration: 4, percentComplete: 75, parentId: 1 },
            { id: 7, name: 'Kickoff Meeting Prep', startDate: new Date('2025-01-22'), duration: 3, percentComplete: 70, parentId: 1 },
            { id: 8, name: 'Communication Plan', startDate: new Date('2025-01-25'), duration: 3, percentComplete: 60, parentId: 1 },
            { id: 9, name: 'Quality Standards', startDate: new Date('2025-01-28'), duration: 3, percentComplete: 50, parentId: 1 },

            // WBS 2: Planning (20 activities)
            { id: 10, name: 'Phase 2: Planning', startDate: new Date('2025-02-01'), duration: 45, percentComplete: 60, parentId: 0, isExpanded: true },
            { id: 11, name: 'Requirements Gathering', startDate: new Date('2025-02-01'), duration: 7, percentComplete: 100, parentId: 10 },
            { id: 12, name: 'Requirements Analysis', startDate: new Date('2025-02-08'), duration: 5, percentComplete: 90, parentId: 10 },
            { id: 13, name: 'Requirements Documentation', startDate: new Date('2025-02-13'), duration: 4, percentComplete: 85, parentId: 10 },
            { id: 14, name: 'Scope Definition', startDate: new Date('2025-02-17'), duration: 5, percentComplete: 80, parentId: 10 },
            { id: 15, name: 'WBS Creation', startDate: new Date('2025-02-22'), duration: 3, percentComplete: 75, parentId: 10 },
            { id: 16, name: 'Schedule Development', startDate: new Date('2025-02-25'), duration: 6, percentComplete: 70, parentId: 10 },
            { id: 17, name: 'Cost Estimation', startDate: new Date('2025-03-03'), duration: 5, percentComplete: 65, parentId: 10 },
            { id: 18, name: 'Resource Allocation', startDate: new Date('2025-03-08'), duration: 4, percentComplete: 60, parentId: 10 },
            { id: 19, name: 'Risk Planning', startDate: new Date('2025-03-12'), duration: 5, percentComplete: 55, parentId: 10 },
            { id: 20, name: 'Quality Planning', startDate: new Date('2025-03-17'), duration: 4, percentComplete: 50, parentId: 10 },
            { id: 21, name: 'Procurement Planning', startDate: new Date('2025-03-21'), duration: 3, percentComplete: 45, parentId: 10 },
            { id: 22, name: 'Baseline Approval', startDate: new Date('2025-03-24'), duration: 2, percentComplete: 40, parentId: 10 },

            // WBS 3: Design (18 activities)
            { id: 23, name: 'Phase 3: Design', startDate: new Date('2025-03-26'), duration: 50, percentComplete: 40, parentId: 0, isExpanded: true },
            { id: 24, name: 'Architecture Design', startDate: new Date('2025-03-26'), duration: 8, percentComplete: 70, parentId: 23 },
            { id: 25, name: 'Database Design', startDate: new Date('2025-04-03'), duration: 6, percentComplete: 65, parentId: 23 },
            { id: 26, name: 'UI/UX Design', startDate: new Date('2025-04-09'), duration: 7, percentComplete: 60, parentId: 23 },
            { id: 27, name: 'API Design', startDate: new Date('2025-04-16'), duration: 5, percentComplete: 55, parentId: 23 },
            { id: 28, name: 'Security Design', startDate: new Date('2025-04-21'), duration: 6, percentComplete: 50, parentId: 23 },
            { id: 29, name: 'Integration Design', startDate: new Date('2025-04-27'), duration: 5, percentComplete: 45, parentId: 23 },
            { id: 30, name: 'Performance Design', startDate: new Date('2025-05-02'), duration: 4, percentComplete: 40, parentId: 23 },
            { id: 31, name: 'Design Review', startDate: new Date('2025-05-06'), duration: 3, percentComplete: 35, parentId: 23 },
            { id: 32, name: 'Design Approval', startDate: new Date('2025-05-09'), duration: 2, percentComplete: 30, parentId: 23 },

            // WBS 4: Development (25 activities)
            { id: 33, name: 'Phase 4: Development', startDate: new Date('2025-05-11'), duration: 90, percentComplete: 25, parentId: 0, isExpanded: true },
            { id: 34, name: 'Environment Setup', startDate: new Date('2025-05-11'), duration: 3, percentComplete: 100, parentId: 33 },
            { id: 35, name: 'Database Implementation', startDate: new Date('2025-05-14'), duration: 8, percentComplete: 80, parentId: 33 },
            { id: 36, name: 'Backend Development - Auth', startDate: new Date('2025-05-22'), duration: 7, percentComplete: 70, parentId: 33 },
            { id: 37, name: 'Backend Development - Core', startDate: new Date('2025-05-29'), duration: 10, percentComplete: 60, parentId: 33 },
            { id: 38, name: 'Backend Development - API', startDate: new Date('2025-06-08'), duration: 8, percentComplete: 50, parentId: 33 },
            { id: 39, name: 'Frontend Development - Layout', startDate: new Date('2025-06-16'), duration: 6, percentComplete: 40, parentId: 33 },
            { id: 40, name: 'Frontend Development - Components', startDate: new Date('2025-06-22'), duration: 9, percentComplete: 35, parentId: 33 },
            { id: 41, name: 'Frontend Development - Pages', startDate: new Date('2025-07-01'), duration: 8, percentComplete: 30, parentId: 33 },
            { id: 42, name: 'Integration Development', startDate: new Date('2025-07-09'), duration: 7, percentComplete: 25, parentId: 33 },
            { id: 43, name: 'Security Implementation', startDate: new Date('2025-07-16'), duration: 6, percentComplete: 20, parentId: 33 },
            { id: 44, name: 'Performance Optimization', startDate: new Date('2025-07-22'), duration: 5, percentComplete: 15, parentId: 33 },
            { id: 45, name: 'Error Handling', startDate: new Date('2025-07-27'), duration: 4, percentComplete: 10, parentId: 33 },
            { id: 46, name: 'Logging Implementation', startDate: new Date('2025-07-31'), duration: 3, percentComplete: 5, parentId: 33 },
            { id: 47, name: 'Code Review', startDate: new Date('2025-08-03'), duration: 5, percentComplete: 0, parentId: 33 },

            // WBS 5: Testing (15 activities)
            { id: 48, name: 'Phase 5: Testing', startDate: new Date('2025-08-08'), duration: 60, percentComplete: 10, parentId: 0, isExpanded: true },
            { id: 49, name: 'Test Plan Creation', startDate: new Date('2025-08-08'), duration: 5, percentComplete: 80, parentId: 48 },
            { id: 50, name: 'Unit Testing', startDate: new Date('2025-08-13'), duration: 10, percentComplete: 60, parentId: 48 },
            { id: 51, name: 'Integration Testing', startDate: new Date('2025-08-23'), duration: 8, percentComplete: 40, parentId: 48 },
            { id: 52, name: 'System Testing', startDate: new Date('2025-08-31'), duration: 10, percentComplete: 30, parentId: 48 },
            { id: 53, name: 'Performance Testing', startDate: new Date('2025-09-10'), duration: 7, percentComplete: 20, parentId: 48 },
            { id: 54, name: 'Security Testing', startDate: new Date('2025-09-17'), duration: 6, percentComplete: 15, parentId: 48 },
            { id: 55, name: 'UAT Preparation', startDate: new Date('2025-09-23'), duration: 4, percentComplete: 10, parentId: 48 },
            { id: 56, name: 'UAT Execution', startDate: new Date('2025-09-27'), duration: 8, percentComplete: 5, parentId: 48 },
            { id: 57, name: 'Bug Fixing', startDate: new Date('2025-10-05'), duration: 10, percentComplete: 0, parentId: 48 },
            { id: 58, name: 'Regression Testing', startDate: new Date('2025-10-15'), duration: 5, percentComplete: 0, parentId: 48 },

            // WBS 6: Deployment & Closure (7 activities)
            { id: 59, name: 'Phase 6: Deployment & Closure', startDate: new Date('2025-10-20'), duration: 40, percentComplete: 0, parentId: 0, isExpanded: true },
            { id: 60, name: 'Deployment Planning', startDate: new Date('2025-10-20'), duration: 5, percentComplete: 0, parentId: 59 },
            { id: 61, name: 'Production Setup', startDate: new Date('2025-10-25'), duration: 6, percentComplete: 0, parentId: 59 },
            { id: 62, name: 'Data Migration', startDate: new Date('2025-10-31'), duration: 7, percentComplete: 0, parentId: 59 },
            { id: 63, name: 'Go-Live', startDate: new Date('2025-11-07'), duration: 3, percentComplete: 0, parentId: 59 },
            { id: 64, name: 'Post-Deployment Support', startDate: new Date('2025-11-10'), duration: 10, percentComplete: 0, parentId: 59 },
            { id: 65, name: 'Documentation', startDate: new Date('2025-11-20'), duration: 5, percentComplete: 0, parentId: 59 },
            { id: 66, name: 'Project Closure', startDate: new Date('2025-11-25'), duration: 5, percentComplete: 0, parentId: 59 }
        ],
        dependencies: [
            { id: 1, sourceId: 2, targetId: 3, type: 'FS' },
            { id: 2, sourceId: 3, targetId: 4, type: 'FS' },
            { id: 3, sourceId: 11, targetId: 12, type: 'FS' },
            { id: 4, sourceId: 12, targetId: 13, type: 'FS' },
            { id: 5, sourceId: 24, targetId: 25, type: 'FS' },
            { id: 6, sourceId: 25, targetId: 26, type: 'FS' },
            { id: 7, sourceId: 35, targetId: 36, type: 'FS' },
            { id: 8, sourceId: 36, targetId: 37, type: 'FS' },
            { id: 9, sourceId: 50, targetId: 51, type: 'FS' },
            { id: 10, sourceId: 51, targetId: 52, type: 'FS' }
        ]
    });

    // Selectors
    activities = computed(() => this.state().activities);
    dependencies = computed(() => this.state().dependencies);
    projectStartDate = computed(() => this.state().projectStartDate);
    projectEndDate = computed(() => this.state().projectEndDate);

    // Selected Activity (shared between components)
    selectedActivity = signal<Activity | null>(null);

    setSelectedActivity(activity: Activity | null) {
        this.selectedActivity.set(activity);
    }

    // History for undo/redo
    private history: ProjectState[] = [];
    private historyIndex: number = -1;
    private maxHistorySize: number = 50;

    constructor() {
        // Save initial state
        this.saveToHistory();
    }

    private saveToHistory() {
        // Remove any future states if we're not at the end
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add current state
        this.history.push(JSON.parse(JSON.stringify(this.state())));

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    canUndo(): boolean {
        return this.historyIndex > 0;
    }

    canRedo(): boolean {
        return this.historyIndex < this.history.length - 1;
    }

    undo() {
        if (this.canUndo()) {
            this.historyIndex--;
            this.state.set(JSON.parse(JSON.stringify(this.history[this.historyIndex])));
        }
    }

    redo() {
        if (this.canRedo()) {
            this.historyIndex++;
            this.state.set(JSON.parse(JSON.stringify(this.history[this.historyIndex])));
        }
    }

    addActivity(parentId: number | null = null) {
        const newId = Math.max(...this.state().activities.map(a => a.id)) + 1;
        const newActivity: Activity = {
            id: newId,
            name: 'New Activity',
            startDate: new Date(),
            duration: 5,
            percentComplete: 0,
            parentId: parentId
        };

        this.state.update(current => ({
            ...current,
            activities: [...current.activities, newActivity]
        }));
        this.saveToHistory();
    }

    deleteActivity(activityId: number) {
        // Don't delete if it has children
        if (this.isParent(activityId)) {
            alert('Cannot delete activity with children. Delete children first.');
            return;
        }

        this.state.update(current => ({
            ...current,
            activities: current.activities.filter(a => a.id !== activityId),
            dependencies: current.dependencies.filter(d => d.sourceId !== activityId && d.targetId !== activityId)
        }));
        this.saveToHistory();
    }

    updateActivity(updatedActivity: Activity) {
        this.state.update(current => ({
            ...current,
            activities: current.activities.map(a => a.id === updatedActivity.id ? updatedActivity : a)
        }));
        this.saveToHistory();
    }

    addDependency(sourceId: number, targetId: number, type: 'FS' | 'FF' | 'SS' | 'SF' = 'FS') {
        this.state.update(current => ({
            ...current,
            dependencies: [...current.dependencies, { id: Date.now(), sourceId, targetId, type }]
        }));
    }

    removeDependency(id: number) {
        this.state.update(current => ({
            ...current,
            dependencies: current.dependencies.filter(d => d.id !== id)
        }));
    }

    // WBS Hierarchy Methods
    getChildren(parentId: number): Activity[] {
        return this.state().activities.filter(a => a.parentId === parentId);
    }

    getLevel(activityId: number): number {
        const activity = this.state().activities.find(a => a.id === activityId);
        if (!activity || activity.parentId === null || activity.parentId === undefined) return 0;
        return 1 + this.getLevel(activity.parentId);
    }

    toggleExpand(activityId: number) {
        this.state.update(current => ({
            ...current,
            activities: current.activities.map(a =>
                a.id === activityId ? { ...a, isExpanded: !a.isExpanded } : a
            )
        }));
    }

    isParent(activityId: number): boolean {
        return this.state().activities.some(a => a.parentId === activityId);
    }
}
