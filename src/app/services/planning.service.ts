import { Injectable, signal, computed, WritableSignal, PLATFORM_ID, inject, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Activity, Dependency, ProjectState, ActivityStep, Calendar } from '../models/planning.models';
import { ApiService } from './api.service';
import { forkJoin, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PlanningService {
    private platformId = inject(PLATFORM_ID);

    // State Signals
    public state: WritableSignal<ProjectState> = signal({
        projectStartDate: new Date('2025-01-01'),
        projectEndDate: new Date('2025-12-31'),
        projectId: 1, // Default ID
        projectName: 'Reference Project',
        activities: [
            // Root WBS
            { id: 0, name: 'Total Project', startDate: new Date('2025-01-01'), duration: 320, percentComplete: 35, parentId: null, isExpanded: true },
            // WBS 1: Project Initiation (15 activities)
            { id: 1, name: 'Phase 1: Project Initiation', startDate: new Date('2025-01-01'), duration: 30, percentComplete: 80, parentId: 0, isExpanded: true },
            { id: 2, name: 'Charter Development', startDate: new Date('2025-01-01'), duration: 5, percentComplete: 100, parentId: 1, resourceItems: [{ id: 1, activityId: 2, resourceId: 101, amount: 8 }] },
            { id: 3, name: 'Stakeholder Identification', startDate: new Date('2025-01-06'), duration: 3, percentComplete: 100, parentId: 1, resourceItems: [{ id: 2, activityId: 3, resourceId: 102, amount: 16 }] },
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
        ],
        resourceTypes: [
            { id: 1, name: 'Human', description: 'Labor resources' },
            { id: 2, name: 'Machine', description: 'Equipment and machinery' },
            { id: 3, name: 'Material', description: 'Consumable materials' }
        ],
        resources: [
            { id: 101, name: 'Project Manager', unit: 'hour', costPerUnit: 150, resourceTypeId: 1 },
            { id: 102, name: 'Senior Developer', unit: 'hour', costPerUnit: 120, resourceTypeId: 1 },
            { id: 103, name: 'Concrete', unit: 'm3', costPerUnit: 200, resourceTypeId: 3 },
            { id: 104, name: 'Excavator', unit: 'day', costPerUnit: 1200, resourceTypeId: 2 }
        ],
        calendars: [
            {
                id: 1,
                name: 'Standard Work Week',
                isDefault: true,
                workDays: [false, true, true, true, true, true, false], // Sun-Sat
                workHoursPerDay: 8,
                holidays: [],
                description: '5-day work week, Monday-Friday'
            }
        ],
        defaultCalendarId: 1
    });

    // Selectors
    activities = computed(() => this.state().activities);
    dependencies = computed(() => this.state().dependencies);
    resources = computed(() => this.state().resources);
    projectStartDate = computed(() => this.state().projectStartDate);
    projectEndDate = computed(() => this.state().projectEndDate);

    resourceTypes = computed(() => this.state().resourceTypes);
    // Code Accessors
    activityCodeDefinitions = computed(() => this.state().activityCodeDefinitions || []);

    // Selected Activity (shared between components)
    selectedActivity = signal<Activity | null>(null);

    setSelectedActivity(activity: Activity | null) {
        this.selectedActivity.set(activity);
    }

    // Calendar Management
    addCalendar(calendar: Partial<Calendar>) {
        // Map partial to full object for API if needed, or let API handle validation
        this.apiService.createCalendar(calendar).subscribe({
            next: (createdCal) => {
                this.state.update(current => ({
                    ...current,
                    calendars: [...(current.calendars || []), createdCal]
                }));
            },
            error: (err) => console.error('Failed to create calendar:', err)
        });
    }

    updateCalendar(updatedCalendar: Calendar) {
        this.apiService.updateCalendar(updatedCalendar.id, updatedCalendar).subscribe({
            next: () => {
                this.state.update(current => ({
                    ...current,
                    calendars: (current.calendars || []).map(c => c.id === updatedCalendar.id ? updatedCalendar : c)
                }));
                // Logic for default calendar handling might be needed if changed
            },
            error: (err) => console.error('Failed to update calendar:', err)
        });
    }

    deleteCalendar(calendarId: number) {
        this.apiService.deleteCalendar(calendarId).subscribe({
            next: () => {
                this.state.update(current => ({
                    ...current,
                    calendars: current.calendars!.filter(c => c.id !== calendarId)
                }));
            },
            error: (err) => console.error('Failed to delete calendar:', err)
        });
    }

    // Calendar Helpers
    private getCalendar(id?: number): Calendar {
        const state = this.state();
        if (id) {
            const cal = state.calendars?.find(c => c.id === id);
            if (cal) return cal;
        }
        // Fallback to default
        const defaultCal = state.calendars?.find(c => c.isDefault) || (state.calendars && state.calendars.length > 0 ? state.calendars[0] : null);

        if (!defaultCal) {
            // Emergency fallback if absolutely no calendars exist
            return {
                id: 0,
                name: 'Fallback Standard',
                isDefault: true,
                workDays: [false, true, true, true, true, true, false],
                workHoursPerDay: 8,
                holidays: []
            };
        }
        return defaultCal;
    }

    private isWorkDay(date: Date, calendar: Calendar): boolean {
        const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
        if (!calendar.workDays[dayOfWeek]) return false;

        // Check holidays
        // Normalize date to YYYY-MM-DD for comparison
        const checkStr = date.toISOString().split('T')[0];
        const isHoliday = calendar.holidays.some(h => {
            const hDate = new Date(h);
            return hDate.toISOString().split('T')[0] === checkStr;
        });

        return !isHoliday;
    }

    private addWorkDays(startDate: Date, days: number, calendar: Calendar): Date {
        let current = new Date(startDate);
        let daysAdded = 0;

        // If simpler logic needed: 
        // 0 duration = same day (start/finish)
        // 1 duration = start + end same day (if workday)

        // We need to advance 'days' amount of working days.
        // Standard convention: Finish = Start + Duration - 1 (inclusive)
        // But for calculation, we find the date that is 'days' working days away.

        // Logic: 
        // 1. Check if start date itself is working day. If not, move to next working day?
        // Usually Start Date is assumed valid or moved to next valid.
        // Let's ensure start is valid first
        while (!this.isWorkDay(current, calendar)) {
            current.setDate(current.getDate() + 1);
        }

        if (days <= 0) return current; // Milestone or zero duration

        // We usually want: Finish Date.
        // If Duration is 1 day, Finish = Start.
        // So we iterate (days - 1) times to find Finish.

        let remaining = days - 1;
        while (remaining > 0) {
            current.setDate(current.getDate() + 1);
            if (this.isWorkDay(current, calendar)) {
                remaining--;
            }
        }

        return current;
    }

    private subtractWorkDays(endDate: Date, days: number, calendar: Calendar): Date {
        let current = new Date(endDate);

        // Ensure end date is valid working day
        while (!this.isWorkDay(current, calendar)) {
            current.setDate(current.getDate() - 1);
        }

        if (days <= 0) return current;

        let remaining = days - 1;
        while (remaining > 0) {
            current.setDate(current.getDate() - 1);
            if (this.isWorkDay(current, calendar)) {
                remaining--;
            }
        }
        return current;
    }

    // History for undo/redo

    constructor(private apiService: ApiService) {
        // Auto-save effect removed as we now save explicitly via API

        if (isPlatformBrowser(this.platformId)) {
            // Load LAST opened project if available?
            // For now, ProjectsPage handles loading specific projects.
        }
    }

    loadFullProject(projectId: number) {
        return this.apiService.getFullProject(projectId).pipe(
            map(data => {
                const project = data.projects[0];
                if (!project) throw new Error('Project not found');

                const newState: ProjectState = {
                    projectId: project.id,
                    projectName: project.name,
                    projectDescription: project.description,
                    projectStartDate: new Date(project.startDate),
                    projectEndDate: new Date(project.endDate),
                    activities: data.activities.map((a: any) => ({
                        ...a,
                        startDate: new Date(a.startDate),
                        earlyStart: a.earlyStart ? new Date(a.earlyStart) : undefined,
                        earlyFinish: a.earlyFinish ? new Date(a.earlyFinish) : undefined,
                        lateStart: a.lateStart ? new Date(a.lateStart) : undefined,
                        lateFinish: a.lateFinish ? new Date(a.lateFinish) : undefined,
                        baselineStartDate: a.baselineStartDate ? new Date(a.baselineStartDate) : undefined,
                        baselineEndDate: a.baselineEndDate ? new Date(a.baselineEndDate) : undefined
                    })),
                    dependencies: data.dependencies,
                    resources: data.resources,
                    calendars: data.calendars.map((c: any) => ({
                        ...c,
                        holidays: (c.holidays || []).map((h: any) => new Date(h.date)),
                        workDays: (c.workDays || []).sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek).map((wd: any) => wd.isWorkDay)
                    })),
                    activityCodeDefinitions: []
                };

                this.state.set(newState);
                this.scheduleProject();
                return true;
            })
        );
    }

    // Persistence - Removed local storage saving
    private saveStateToStorage() {
        // No-op
    }

    loadProjectState(newState: ProjectState) {
        // Helper to parse dates recursively or specifically
        const parseDates = (obj: any): any => {
            if (!obj) return obj;
            // If it's the root state, parse specific fields
            if (obj.projectStartDate) obj.projectStartDate = new Date(obj.projectStartDate);
            if (obj.projectEndDate) obj.projectEndDate = new Date(obj.projectEndDate);
            if (obj.statusDate) obj.statusDate = new Date(obj.statusDate);

            if (Array.isArray(obj.activities)) {
                obj.activities.forEach((a: any) => {
                    if (a.startDate) a.startDate = new Date(a.startDate);
                    if (a.earlyStart) a.earlyStart = new Date(a.earlyStart);
                    if (a.earlyFinish) a.earlyFinish = new Date(a.earlyFinish);
                    if (a.lateStart) a.lateStart = new Date(a.lateStart);
                    if (a.lateFinish) a.lateFinish = new Date(a.lateFinish);
                    if (a.baselineStartDate) a.baselineStartDate = new Date(a.baselineStartDate);
                    if (a.baselineEndDate) a.baselineEndDate = new Date(a.baselineEndDate);
                });
            }
            // Calendars
            if (Array.isArray(obj.calendars)) {
                obj.calendars.forEach((c: any) => {
                    if (Array.isArray(c.holidays)) {
                        c.holidays = c.holidays.map((h: any) => new Date(h));
                    }
                });
            }
            return obj;
        };

        const parsedState = parseDates(newState);

        this.state.set({
            ...parsedState,
            activities: parsedState.activities || [],
            dependencies: parsedState.dependencies || [],
            resources: parsedState.resources || []
        });
        this.saveStateToStorage();
        this.recalculateProjectBounds();
        this.saveToHistory();
    }

    private assignMockResources() {
        this.state.update(state => {
            const resources = state.resources;
            if (!resources || resources.length === 0) return state;

            const activities = state.activities.map(activity => {
                // Skip root or parents (summary tasks usually don't have direct resources)
                const isParent = state.activities.some(a => a.parentId === activity.id);
                if (activity.parentId === null || isParent) return activity;

                // Skip if already manually assigned
                if (activity.resourceItems && activity.resourceItems.length > 0) return activity;

                // Assign 1 or 2 random resources
                const items: any[] = []; // Type any to avoid strict ID collisions in mock logic
                const numResources = Math.floor(Math.random() * 2) + 1;

                for (let i = 0; i < numResources; i++) {
                    const res = resources[Math.floor(Math.random() * resources.length)];
                    // Simple check to avoid duplicates
                    if (!items.some(x => x.resourceId === res.id)) {
                        items.push({
                            id: Math.floor(Math.random() * 1000000) + 1000,
                            activityId: activity.id,
                            resourceId: res.id,
                            amount: Math.floor(Math.random() * 20) + 5
                        });
                    }
                }
                return { ...activity, resourceItems: items };
            });
            return { ...state, activities };
        });
    }

    private saveToHistory() {
        // No-op for now due to API sync
    }

    canUndo(): boolean {
        return false;
    }

    canRedo(): boolean {
        return false;
    }

    undo() {
        console.warn('Undo not supported in API mode yet');
    }

    redo() {
        console.warn('Redo not supported in API mode yet');
    }

    addActivity(parentId: number | null = null) {
        const newActivity = {
            name: 'New Activity',
            startDate: new Date(), // API expects ISO string usually, but let's check Service
            duration: 5,
            percentComplete: 0,
            parentId: parentId,
            projectId: this.state().projectId
        };

        this.apiService.createActivity(newActivity).subscribe({
            next: (createdActivity) => {
                this.state.update(current => ({
                    ...current,
                    activities: [...current.activities, {
                        ...createdActivity,
                        startDate: new Date(createdActivity.startDate),
                        // Handle other dates if returned
                    }]
                }));
                this.recalculateProjectBounds();
            },
            error: (err) => console.error('Failed to create activity:', err)
        });
    }

    deleteActivity(activityId: number) {
        // Don't delete if it has children
        if (this.isParent(activityId)) {
            alert('Cannot delete activity with children. Delete children first.');
            return;
        }

        this.apiService.deleteActivity(activityId).subscribe({
            next: () => {
                this.state.update(current => ({
                    ...current,
                    activities: current.activities.filter(a => a.id !== activityId),
                    dependencies: current.dependencies.filter(d => d.sourceId !== activityId && d.targetId !== activityId)
                }));
                this.recalculateProjectBounds();
            },
            error: (err) => console.error('Failed to delete activity:', err)
        });
    }

    updateActivity(updatedActivity: Activity) {
        // Optimistic update? Or wait? Let's wait for now to be safe.
        this.apiService.updateActivity(updatedActivity.id, updatedActivity).subscribe({
            next: (savedProjectActivity) => {
                this.state.update(current => ({
                    ...current,
                    activities: current.activities.map(a => a.id === updatedActivity.id ? updatedActivity : a)
                }));
                this.recalculateProjectBounds();
            },
            error: (err) => console.error('Failed to update activity:', err)
        });
    }

    addDependency(sourceId: number, targetId: number, type: 'FS' | 'FF' | 'SS' | 'SF' = 'FS') {
        const dep = { sourceId, targetId, type, projectId: this.state().projectId };
        this.apiService.createDependency(dep).subscribe({
            next: (createdDep) => {
                this.state.update(current => ({
                    ...current,
                    dependencies: [...current.dependencies, createdDep]
                }));
                // No need to save history
            },
            error: (err) => console.error('Failed to create dependency:', err)
        });
    }

    removeDependency(id: number) {
        this.apiService.deleteDependency(id).subscribe({
            next: () => {
                this.state.update(current => ({
                    ...current,
                    dependencies: current.dependencies.filter(d => d.id !== id)
                }));
            },
            error: (err) => console.error('Failed to delete dependency:', err)
        });
    }

    updateDependency(id: number, updates: Partial<Dependency>) {
        this.apiService.updateDependency(id, updates).subscribe({
            next: () => {
                this.state.update(current => ({
                    ...current,
                    dependencies: current.dependencies.map(d => d.id === id ? { ...d, ...updates } : d)
                }));
            },
            error: (err) => console.error('Failed to update dependency:', err)
        });
    }

    addResource(resource: any) {
        // Resources are global usually, but let's assume we manage them here too
        this.apiService.createResource(resource).subscribe({
            next: (createdResource) => {
                this.state.update(current => ({
                    ...current,
                    resources: [...(current.resources || []), createdResource]
                }));
            },
            error: (err) => console.error('Failed to create resource:', err)
        });
    }

    assignResourceToActivity(activityId: number, resourceId: number, amount: number) {
        const assignment = { resourceId, amount, activityId };
        this.apiService.assignResourceToActivity(activityId, assignment).subscribe({
            next: (createdAssignment) => {
                this.state.update(current => {
                    const activities = current.activities.map(a => {
                        if (a.id !== activityId) return a;
                        const currentItems = a.resourceItems || [];
                        return { ...a, resourceItems: [...currentItems, createdAssignment] };
                    });
                    return { ...current, activities };
                });

                // Update selectedActivity if needed
                const currentSelected = this.selectedActivity();
                if (currentSelected && currentSelected.id === activityId) {
                    // Refresh selected activity from state
                    const updated = this.state().activities.find(a => a.id === activityId) || null;
                    this.selectedActivity.set(updated);
                }
            },
            error: (err) => console.error('Failed to assign resource:', err)
        });
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

    // CPM Scheduling Logic
    scheduleProject() {
        const state = this.state();
        let activities = [...state.activities]; // Clone for mutation during calc
        const dependencies = state.dependencies;

        // 1. Map for easy access
        const actMap = new Map<number, Activity>();
        activities.forEach(a => actMap.set(a.id, a));

        // 2. Predecessor/Successor Maps
        const predecessors = new Map<number, Dependency[]>();
        const successors = new Map<number, Dependency[]>();

        dependencies.forEach(dep => {
            if (!predecessors.has(dep.targetId)) predecessors.set(dep.targetId, []);
            predecessors.get(dep.targetId)!.push(dep);

            if (!successors.has(dep.sourceId)) successors.set(dep.sourceId, []);
            successors.get(dep.sourceId)!.push(dep);
        });

        // 3. Topological Sort (Kahn's algorithm roughly, or just level based)
        // For simple CPM, we can just iterate if we ensure we process ready nodes.
        // Actually, easiest is to just compute Early Dates then Late Dates.
        // We need an order where predecessors are processed before successors.

        // Simple Topological Sort
        const sortedIds: number[] = [];
        const visited = new Set<number>();
        const tempVisited = new Set<number>();

        const visit = (id: number) => {
            if (tempVisited.has(id)) throw new Error("Cycle detected");
            if (!visited.has(id)) {
                tempVisited.add(id);
                const succs = successors.get(id) || [];
                succs.forEach(dep => visit(dep.targetId));
                tempVisited.delete(id);
                visited.add(id);
                sortedIds.unshift(id); // Post-order, so unshift gives Topological order
            }
        };

        try {
            activities.forEach(a => {
                // Only sort leaf nodes or treat parents as summaries?
                // Standard CPM: Only leaf nodes (activities) have duration/logic. Parents summarize.
                // For this implementation, we'll treat all as tasks but ignore parent/child containment for logic 
                // UNLESS we want strict WBS rollups. Let's start with activity-level logic ignoring WBS for calc.
                if (!visited.has(a.id)) visit(a.id);
            });
        } catch (e) {
            console.error("Scheduling failed: Cycle detected");
            alert("Scheduling failed: Cycle detected in relationships.");
            return;
        }

        // 4. Forward Pass (Early Dates)
        const projectStart = new Date(state.projectStartDate);

        sortedIds.forEach(id => {
            const act = actMap.get(id)!;
            const calendar = this.getCalendar(act.calendarId);

            // Milestone Logic: Enforce 0 duration if Milestone
            if (act.type === 'StartMilestone' || act.type === 'FinishMilestone') {
                act.duration = 0;
            }

            if (this.isParent(id)) return; // Skip summaries for logic

            let earlyStart = new Date(projectStart);

            const preds = predecessors.get(id) || [];

            // If no predecessors, default to Project Start (adjusted for calendar)
            if (preds.length === 0) {
                // Adjust project start to be a valid workday on this calendar
                let validStart = new Date(projectStart);
                while (!this.isWorkDay(validStart, calendar)) {
                    validStart.setDate(validStart.getDate() + 1);
                }
                earlyStart = validStart;
            }

            preds.forEach(dep => {
                const src = actMap.get(dep.sourceId)!;
                if (!src.earlyFinish) return;

                let potentialStart: Date;
                const lag = (dep.lag || 0);

                // Note: Relationships might span different calendars. 
                // P6 usually uses Predecessor Calendar for lag? Or Successor? 
                // Simplified: Use Successor Calendar for lag calculation.

                if (dep.type === 'FS') {
                    // Finish to Start: Start = Pred Finish + Lag + 1 day (next working day)
                    // Actually, if we use inclusive dates:
                    // Finish = Fri. Next Start = Mon.
                    // We generate "Next working day after Finish" + Lag

                    let baseDate = new Date(src.earlyFinish);

                    // Move to next working day (Start of next period)
                    baseDate.setDate(baseDate.getDate() + 1);
                    while (!this.isWorkDay(baseDate, calendar)) {
                        baseDate.setDate(baseDate.getDate() + 1);
                    }

                    // Add Lag
                    potentialStart = this.addWorkDays(baseDate, lag + 1, calendar);
                    // Wait, addWorkDays adds (N-1). If Lag is 0, we want exactly baseDate.
                    // If addWorkDays(baseDate, 1) -> Returns baseDate. Correct.
                    // So addWorkDays(baseDate, lag + 1) -> Returns date (lag) days after baseDate.
                } else if (dep.type === 'SS') {
                    // Start to Start: Start = Pred Start + Lag
                    potentialStart = this.addWorkDays(src.earlyStart!, lag + 1, calendar);
                } else if (dep.type === 'FF') {
                    // Finish to Finish: Finish = Pred Finish + Lag
                    // Derived Start = Finish - Duration
                    const finishDate = this.addWorkDays(src.earlyFinish, lag + 1, calendar);
                    // Back calculate Start
                    potentialStart = this.subtractWorkDays(finishDate, act.duration, calendar);
                } else {
                    // SF not fully implemented, treat as FS
                    potentialStart = new Date(src.earlyFinish);
                }

                if (potentialStart > earlyStart) {
                    earlyStart = potentialStart;
                }
            });

            act.earlyStart = earlyStart;
            act.startDate = earlyStart;

            // Calculate Finish
            act.earlyFinish = this.addWorkDays(earlyStart, act.duration, calendar);
        });

        // 5. Backward Pass (Late Dates & Float)
        let projectFinish = new Date(projectStart);
        activities.forEach(a => {
            if (!this.isParent(a.id) && a.earlyFinish && a.earlyFinish > projectFinish) {
                projectFinish = new Date(a.earlyFinish);
            }
        });

        this.state.update(s => ({ ...s, projectEndDate: projectFinish }));

        [...sortedIds].reverse().forEach(id => {
            const act = actMap.get(id)!;
            if (this.isParent(id)) return;

            const calendar = this.getCalendar(act.calendarId);

            let lateFinish = new Date(projectFinish);
            let constrained = false;

            const succs = successors.get(id) || [];
            if (succs.length > 0) {
                lateFinish = new Date(8640000000000000); // Far future
            }

            succs.forEach(dep => {
                const tgt = actMap.get(dep.targetId)!;
                if (!tgt.lateStart) return;

                let potentialFinish: Date;
                const lag = (dep.lag || 0);

                if (dep.type === 'FS') {
                    // Pred Late Finish = Succ Late Start - Lag - 1 day (prev working day)
                    // Or Succ Start = Pred Finish + Lag + 1
                    // So Pred Finish = Succ Start - Lag - 1

                    // 1. Shift back Lag
                    let baseDate = this.subtractWorkDays(tgt.lateStart, lag + 1, calendar);

                    // 2. Shift back 1 day (because FS implies Next Day Start)
                    // Move to previous working day
                    baseDate.setDate(baseDate.getDate() - 1);
                    while (!this.isWorkDay(baseDate, calendar)) {
                        baseDate.setDate(baseDate.getDate() - 1);
                    }
                    potentialFinish = baseDate;

                } else if (dep.type === 'SS') {
                    // Pred Start = Succ Start - Lag
                    // So Pred Late Start <= Succ Late Start - Lag
                    // Derived Late Finish from Late Start
                    const lateStartLim = this.subtractWorkDays(tgt.lateStart, lag + 1, calendar);
                    potentialFinish = this.addWorkDays(lateStartLim, act.duration, calendar);
                } else if (dep.type === 'FF') {
                    // Pred Finish = Succ Finish - Lag
                    potentialFinish = this.subtractWorkDays(tgt.lateFinish!, lag + 1, calendar);
                } else {
                    potentialFinish = new Date(tgt.lateStart);
                }

                if (potentialFinish < lateFinish) {
                    lateFinish = potentialFinish;
                }
            });

            act.lateFinish = lateFinish;
            // Calculate Late Start
            act.lateStart = this.subtractWorkDays(lateFinish, act.duration, calendar);

            const diffTime = act.lateStart.getTime() - act.earlyStart!.getTime();
            act.totalFloat = Math.round(diffTime / (1000 * 3600 * 24));
            act.isCritical = act.totalFloat <= 0;
        });

        // 6. Rollup Summaries (WBS)
        this.rollupWBS(activities);

        this.state.update(s => ({
            ...s,
            activities: activities
        }));

        this.recalculateProjectBounds();
        this.saveToHistory();
    }

    private recalculateProjectBounds() {
        const state = this.state();
        const activities = state.activities;

        if (!activities || activities.length === 0) return;

        let minStart = new Date(state.projectStartDate);
        let maxEnd = new Date(state.projectEndDate);

        // Flag to check if we actually need to change anything to avoid infinite loops if we were using effects
        let changed = false;

        // Iterate all activities to find true bounds
        activities.forEach(a => {
            const start = a.startDate ? new Date(a.startDate) : null;
            // End date = Start + Duration days
            // Approximate end date for bounds check
            const end = start ? new Date(start.getTime() + (a.duration || 1) * 24 * 60 * 60 * 1000) : null;

            if (start && start < minStart) {
                minStart = start;
                changed = true;
            }
            if (end && end > maxEnd) {
                maxEnd = end;
                changed = true;
            }
        });

        // Add buffer if we extended bounds
        if (changed) {
            // Buffer: 7 days
            const bufferTime = 7 * 24 * 60 * 60 * 1000;
            maxEnd = new Date(maxEnd.getTime() + bufferTime);

            this.state.update(s => ({
                ...s,
                projectStartDate: minStart,
                projectEndDate: maxEnd
            }));
        }
    }

    // WBS Rollup Helper (Recursive Bottom-Up)
    private rollupWBS(activities: Activity[]) {
        const activityMap = new Map<number, Activity>();
        activities.forEach(a => activityMap.set(a.id, a));

        // Get all parents (activities with children)
        // We need to process from bottom of hierarchy up.
        // A simple way is to calculate level, sort by level desc.

        // Compute levels dynamically since we don't store them strictly
        const getLevel = (id: number): number => {
            const a = activityMap.get(id);
            if (!a || a.parentId == null) return 0;
            return 1 + getLevel(a.parentId);
        };

        const activitieswithLevel = activities.map(a => ({ a, level: getLevel(a.id) }));
        activitieswithLevel.sort((x, y) => y.level - x.level); // Deepest first

        // Set of processed IDs to avoid double work if strictly hierarchical
        const processed = new Set<number>();

        for (const { a } of activitieswithLevel) {
            // If it is a parent (has children), calculate based on children
            // Need to check if it IS a parent.
            const children = activities.filter(child => child.parentId === a.id);

            if (children.length > 0) {
                // It's a summary task
                let minStart: Date | null = null;
                let maxEnd: Date | null = null;

                children.forEach(child => {
                    const childStart = child.startDate ? new Date(child.startDate) : null;
                    const childEnd = child.startDate ? new Date(new Date(child.startDate).getTime() + child.duration * 24 * 3600 * 1000) : null;
                    // Use calculated dates if available (earlyStart/earlyFinish)
                    const s = child.earlyStart ? new Date(child.earlyStart) : childStart;
                    const e = child.earlyFinish ? new Date(child.earlyFinish) : childEnd;

                    if (s) {
                        if (!minStart || s < minStart) minStart = s;
                    }
                    if (e) {
                        if (!maxEnd || e > maxEnd) maxEnd = e;
                    }
                });

                if (minStart && maxEnd) {
                    a.startDate = minStart!;
                    a.earlyStart = minStart!;
                    a.earlyFinish = maxEnd!; // Summary finish needed?

                    const diffTime = (maxEnd as Date).getTime() - (minStart as Date).getTime();
                    a.duration = Math.ceil(diffTime / (1000 * 3600 * 24));

                    // Also rollup progress? (Weighted by duration)
                    let totalDuration = 0;
                    let weightedProgress = 0;
                    children.forEach(c => {
                        totalDuration += c.duration;
                        weightedProgress += c.duration * c.percentComplete;
                    });
                    a.percentComplete = totalDuration > 0 ? Math.round(weightedProgress / totalDuration) : 0;
                }
            }
        }
    }


    // Baseline Management
    assignBaseline() {
        this.state.update(current => {
            const activities = current.activities.map(a => ({
                ...a,
                baselineStartDate: a.startDate ? new Date(a.startDate) : undefined,
                baselineEndDate: a.startDate ? new Date(new Date(a.startDate).getTime() + (a.duration * 24 * 3600 * 1000)) : undefined
            }));
            return { ...current, activities };
        });
        this.saveToHistory();
        this.saveStateToStorage();
    }

    createBaseline() {
        if (!confirm("Are you sure you want to capture the current schedule as the baseline? This will overwrite any existing baseline.")) return;

        this.state.update(current => {
            const activities = current.activities.map(a => {
                const start = new Date(a.startDate);
                const end = new Date(start);
                end.setDate(end.getDate() + a.duration);
                return {
                    ...a,
                    baselineStartDate: start,
                    baselineEndDate: end
                };
            });
            return { ...current, activities };
        });
        this.saveToHistory();
    }

    clearBaseline() {
        if (!confirm("Are you sure you want to clear the baseline?")) return;

        this.state.update(current => {
            const activities = current.activities.map(a => {
                const { baselineStartDate, baselineEndDate, ...rest } = a;
                return rest;
            });
            return { ...current, activities };
        });
        this.saveToHistory();
    }

    // Activity Codes Logic
    addActivityCodeDefinition(name: string) {
        const currentDefs = this.state().activityCodeDefinitions || [];
        const newId = currentDefs.length > 0 ? Math.max(...currentDefs.map(d => d.id)) + 1 : 1;
        const newDef: any = { id: newId, name, values: [] };

        this.state.update(s => ({
            ...s,
            activityCodeDefinitions: [...(s.activityCodeDefinitions || []), newDef]
        }));
        this.saveToHistory();
    }

    deleteActivityCodeDefinition(id: number) {
        this.state.update(s => ({
            ...s,
            activityCodeDefinitions: (s.activityCodeDefinitions || []).filter(d => d.id !== id),
            // Cleanup assignments? Ideally yes, but keeping it simple for now
        }));
        this.saveToHistory();
    }

    addActivityCodeValue(defId: number, value: string, color?: string) {
        this.state.update(s => {
            const defs = s.activityCodeDefinitions || [];
            const defIndex = defs.findIndex(d => d.id === defId);
            if (defIndex === -1) return s;

            const def = defs[defIndex];
            const newValId = def.values.length > 0 ? Math.max(...def.values.map(v => v.id)) + 1 : 1;

            const newVal: any = { id: newValId, codeId: defId, value, color };

            const newDefs = [...defs];
            newDefs[defIndex] = { ...def, values: [...def.values, newVal] };

            return { ...s, activityCodeDefinitions: newDefs };
        });
        this.saveToHistory();
    }

    deleteActivityCodeValue(defId: number, valId: number) {
        this.state.update(s => {
            const defs = s.activityCodeDefinitions || [];
            const defIndex = defs.findIndex(d => d.id === defId);
            if (defIndex === -1) return s;

            const def = defs[defIndex];
            const newDefs = [...defs];
            newDefs[defIndex] = { ...def, values: def.values.filter(v => v.id !== valId) };

            return { ...s, activityCodeDefinitions: newDefs };
        });
        this.saveToHistory();
    }

    assignActivityCode(activityId: number, defId: number, valId: number | null) {
        this.state.update(s => ({
            ...s,
            activities: s.activities.map(a => {
                if (a.id !== activityId) return a;
                const codes = { ...(a.assignedCodes || {}) };
                if (valId === null) {
                    delete codes[defId];
                } else {
                    codes[defId] = valId;
                }
                return { ...a, assignedCodes: codes };
            })
        }));
        this.saveToHistory();
        this.saveStateToStorage();
    }

    // Activity Steps Logic
    addActivityStep(activityId: number, name: string, weight: number = 1) {
        this.state.update(current => {
            const activities = current.activities.map(a => {
                if (a.id !== activityId) return a;
                const steps = a.steps || [];
                const newStep: ActivityStep = {
                    id: Date.now(),
                    name,
                    weight,
                    completed: false
                };
                const updated = { ...a, steps: [...steps, newStep] };
                if (a.earningType === 'Steps') {
                    // updated.percentComplete = this.calculateStepProgress(updated.steps);
                    // Logic moved to helper to verify before assignment
                    const totalWeight = updated.steps.reduce((sum, s) => sum + s.weight, 0);
                    const completedWeight = updated.steps.filter(s => s.completed).reduce((sum, s) => sum + s.weight, 0);
                    updated.percentComplete = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
                }
                return updated;
            });
            return { ...current, activities };
        });
        this.saveToHistory();
    }

    removeActivityStep(activityId: number, stepId: number) {
        this.state.update(current => {
            const activities = current.activities.map(a => {
                if (a.id !== activityId) return a;
                const steps = (a.steps || []).filter(s => s.id !== stepId);
                const updated = { ...a, steps };
                if (a.earningType === 'Steps') {
                    const totalWeight = updated.steps.reduce((sum, s) => sum + s.weight, 0);
                    const completedWeight = updated.steps.filter(s => s.completed).reduce((sum, s) => sum + s.weight, 0);
                    updated.percentComplete = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
                }
                return updated;
            });
            return { ...current, activities };
        });
        this.saveToHistory();
    }

    toggleActivityStep(activityId: number, stepId: number) {
        this.state.update(current => {
            const activities = current.activities.map(a => {
                if (a.id !== activityId) return a;
                const steps = (a.steps || []).map(s => s.id === stepId ? { ...s, completed: !s.completed } : s);
                const updated = { ...a, steps };
                if (a.earningType === 'Steps') {
                    const totalWeight = updated.steps.reduce((sum, s) => sum + s.weight, 0);
                    const completedWeight = updated.steps.filter(s => s.completed).reduce((sum, s) => sum + s.weight, 0);
                    updated.percentComplete = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
                }
                return updated;
            });
            return { ...current, activities };
        });
        this.saveToHistory();
    }

    updateEarningType(activityId: number, type: 'Duration' | 'Physical' | 'Steps') {
        this.state.update(current => {
            const activities = current.activities.map(a => {
                if (a.id !== activityId) return a;
                const updated = { ...a, earningType: type };
                if (type === 'Steps' && a.steps) {
                    const totalWeight = a.steps.reduce((sum, s) => sum + s.weight, 0);
                    const completedWeight = a.steps.filter(s => s.completed).reduce((sum, s) => sum + s.weight, 0);
                    updated.percentComplete = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
                }
                return updated;
            });
            return { ...current, activities };
        });
        this.saveToHistory();
    }

    updateActivityType(id: number, type: 'Task' | 'StartMilestone' | 'FinishMilestone') {
        this.state.update(current => ({
            ...current,
            activities: current.activities.map(a => a.id === id ? { ...a, type } : a)
        }));
        this.saveToHistory();
    }



    // Resource Leveling
    levelResources() {
        // 1. Reset Dates to Basic CPM (Early Dates)
        this.scheduleProject();
        const state = this.state();
        let activities = JSON.parse(JSON.stringify(state.activities)) as Activity[]; // Deep copy

        // Ensure resources have limits (default to 1 if undefined)
        const resources = state.resources || [];
        const resourceLimits = new Map<number, number>();
        resources.forEach(r => resourceLimits.set(r.id, r.limit || 1));

        // 2. Setup Structures
        const allocation = new Map<number, Map<string, number>>();
        const getUsed = (resId: number, dateStr: string): number => {
            if (!allocation.has(resId)) allocation.set(resId, new Map());
            return allocation.get(resId)!.get(dateStr) || 0;
        };
        const addUsage = (resId: number, dateStr: string, amount: number) => {
            if (!allocation.has(resId)) allocation.set(resId, new Map());
            const current = allocation.get(resId)!.get(dateStr) || 0;
            allocation.get(resId)!.set(dateStr, current + amount);
        };

        // Helper to get next working day
        const getNextWorkDay = (date: Date, calendar: Calendar): Date => {
            const next = new Date(date);
            next.setDate(next.getDate() + 1);
            while (!this.isWorkDay(next, calendar)) {
                next.setDate(next.getDate() + 1);
            }
            return next;
        };

        const canSchedule = (act: Activity, startDate: Date, calendar: Calendar): boolean => {
            if (!act.resourceItems || act.resourceItems.length === 0) return true;

            let currentDay = new Date(startDate);
            // Must start on valid working day
            if (!this.isWorkDay(currentDay, calendar)) return false;

            for (let i = 0; i < act.duration; i++) {
                const dateStr = currentDay.toISOString().split('T')[0];
                for (const item of act.resourceItems) {
                    const limit = resourceLimits.get(item.resourceId) || 1;
                    const used = getUsed(item.resourceId, dateStr);
                    if (used + item.amount > limit) return false;
                }

                // Advance to next working day if there are more days
                if (i < act.duration - 1) {
                    currentDay = getNextWorkDay(currentDay, calendar);
                }
            }
            return true;
        };

        const activityMap = new Map<number, Activity>();
        activities.forEach(a => activityMap.set(a.id, a));

        // Dependency Maps
        const succMap = new Map<number, Dependency[]>(); // Source -> [Depts]
        const predMap = new Map<number, number[]>(); // Target -> [Source IDs]

        state.dependencies.forEach(d => {
            if (!succMap.has(d.sourceId)) succMap.set(d.sourceId, []);
            succMap.get(d.sourceId)!.push(d);

            if (!predMap.has(d.targetId)) predMap.set(d.targetId, []);
            predMap.get(d.targetId)!.push(d.sourceId);
        });

        // 3. Serial Method with Eligible Set
        const scheduledIds = new Set<number>();
        const eligibleQueue: Activity[] = [];

        // Initialize Queue: All leaf activities with no predecessors (or all preds ignored/summary)
        const leafActivities = activities.filter(a => !this.isParent(a.id) && a.type !== 'StartMilestone' && a.type !== 'FinishMilestone');

        leafActivities.forEach(a => {
            const preds = predMap.get(a.id) || [];
            // Assuming no circular preds for now (CPM check handles that)
            if (preds.length === 0) {
                eligibleQueue.push(a);
            }
        });

        // Loop until queue empty
        let loopCount = 0;
        const maxLoops = leafActivities.length * 2;

        while (eligibleQueue.length > 0 && loopCount < maxLoops) {
            loopCount++;

            // Sort Eligible Queue (Heuristic)
            eligibleQueue.sort((a, b) => {
                const dateA = new Date(a.earlyStart || a.startDate).getTime();
                const dateB = new Date(b.earlyStart || b.startDate).getTime();
                if (dateA !== dateB) return dateA - dateB;

                const floatA = a.totalFloat || 0;
                const floatB = b.totalFloat || 0;
                if (floatA !== floatB) return floatA - floatB;

                return a.id - b.id;
            });

            // Pop highest priority
            const act = eligibleQueue.shift()!;

            // Double check: if it was already scheduled? (Shouldn't be)
            if (scheduledIds.has(act.id)) continue;

            const calendar = this.getCalendar(act.calendarId);

            // Calculate Effective Start (based on predecessors' LEVELED finish)
            let effectiveStart = new Date(act.earlyStart || act.startDate);
            const preds = state.dependencies.filter(d => d.targetId === act.id);
            preds.forEach(p => {
                const source = activityMap.get(p.sourceId);
                if (source && (scheduledIds.has(source.id) || source.type?.includes('Milestone'))) {
                    // Start logic based on dependency type
                    // For FS: Finish + 1 (work day check handled below)
                    let sourceFinish = new Date(source.startDate);
                    // We need source FINISH date. 
                    // Since source.startDate is set to its leveled date...
                    // We should re-calculate finish? 
                    // Actually source.startDate IS the start.
                    // We can use addWorkDays to find finish efficiently.
                    // sourceFinish = this.addWorkDays(source.startDate, source.duration, sourceCal) ?
                    // But simpler: we know predecessors are scheduled.

                    // Let's assume FS Logic mainly
                    if (p.type === 'FS') {
                        // Get source calendar
                        const sCal = this.getCalendar(source.calendarId);
                        const sFinish = this.addWorkDays(new Date(source.startDate), source.duration, sCal);

                        // Target Start = sFinish + Lag + NextWorkDay
                        // Move to next working day on TARGET calendar (or src? usually target or proj default)
                        // Standard: Lag is on successor calendar (often). 

                        let potentialStart = new Date(sFinish);
                        potentialStart.setDate(potentialStart.getDate() + 1); // Start of next day

                        // Ensure valid workday on TARGET calendar
                        while (!this.isWorkDay(potentialStart, calendar)) {
                            potentialStart.setDate(potentialStart.getDate() + 1);
                        }
                        // Add Lag
                        potentialStart = this.addWorkDays(potentialStart, p.lag ? p.lag + 1 : 1, calendar);

                        if (potentialStart > effectiveStart) effectiveStart = potentialStart;
                    }
                }
            });

            // Ensure effectiveStart is valid workday to begin with
            while (!this.isWorkDay(effectiveStart, calendar)) {
                effectiveStart.setDate(effectiveStart.getDate() + 1);
            }

            // Find Slot
            let testStart = new Date(effectiveStart);
            let delayed = false;
            let attempts = 0;
            // Limit lookahead to prevent infinite loop
            while (!canSchedule(act, testStart, calendar) && attempts < 365) {
                // Try next working day
                testStart = getNextWorkDay(testStart, calendar);
                delayed = true;
                attempts++;
            }

            // Commit
            if (act.resourceItems) {
                let currentDay = new Date(testStart);
                for (let i = 0; i < act.duration; i++) {
                    const dateStr = currentDay.toISOString().split('T')[0];
                    for (const item of act.resourceItems) {
                        addUsage(item.resourceId, dateStr, item.amount);
                    }
                    if (i < act.duration - 1) {
                        currentDay = getNextWorkDay(currentDay, calendar);
                    }
                }
            }

            // Update
            act.startDate = testStart;
            // Recalculate diff 
            const es = new Date(act.earlyStart || act.startDate); // Note: original earlyStart might be old if we didn't preserve it well? 
            // Actually act.earlyStart was set in scheduleProject() at step 1.
            // But we might have mutated acts in previous loops? 
            // In CPM earlyStart is property.

            const diff = (testStart as Date).getTime() - (es as Date).getTime();
            act.levelingDelay = Math.round(diff / (1000 * 3600 * 24));

            scheduledIds.add(act.id);

            // Add successors to queue if eligible
            const succs = succMap.get(act.id) || [];
            succs.forEach(d => {
                const successor = activityMap.get(d.targetId);
                // Must be a leaf task we are managing
                if (successor && !this.isParent(successor.id) && !successor.type?.includes('Milestone')) {
                    // Check if ALL predecessors of this successor are scheduled
                    const succPreds = predMap.get(successor.id) || [];
                    const allPredsDone = succPreds.every(pid => {
                        const pFunc = activityMap.get(pid);
                        if (!pFunc) return true; // Safety
                        if (pFunc.type?.includes('Milestone')) return true; // Milestones don't block logic here? 
                        if (this.isParent(pid)) return true; // Summaries ignored
                        return scheduledIds.has(pid);
                    });

                    if (allPredsDone && !scheduledIds.has(successor.id) && !eligibleQueue.find(q => q.id === successor.id)) {
                        eligibleQueue.push(successor);
                    }
                }
            });
        }

        this.rollupWBS(activities);

        // Recalculate Project End Date (Calendar Bars coverage)
        let maxEnd = new Date(this.state().projectStartDate);
        activities.forEach(a => {
            const cal = this.getCalendar(a.calendarId);
            const finish = this.addWorkDays(new Date(a.startDate), a.duration, cal);
            if (finish > maxEnd) maxEnd = finish;
        });

        this.state.update(s => ({
            ...s,
            activities: activities,
            projectEndDate: maxEnd
        }));
        this.saveToHistory();
    }

    // Relationship Helpers
    getPredecessors(activityId: number): Dependency[] {
        return this.state().dependencies.filter(d => d.targetId === activityId);
    }

    getSuccessors(activityId: number): Dependency[] {
        return this.state().dependencies.filter(d => d.sourceId === activityId);
    }

    isParent(activityId: number): boolean {
        return this.state().activities.some(a => a.parentId === activityId);
    }

    // EVM Calculation
    // EVM Calculation
    calculateEVM(statusDate?: Date): any {
        const dataDate = statusDate || new Date();
        const activities = this.activities();

        let pv = 0, ev = 0, ac = 0;

        activities.forEach(activity => {
            // Use budgetAtCompletion if defined, otherwise fallback to duration as a simple cost unit
            const bac = activity.budgetAtCompletion ?? activity.duration;
            const actualCost = activity.actualCost ?? 0;
            const percentComplete = activity.percentComplete ?? 0;

            // Planned Value (PV) is the portion of BAC planned to be completed by dataDate
            if (activity.startDate <= dataDate) {
                const activityEnd = new Date(activity.startDate);
                activityEnd.setDate(activityEnd.getDate() + activity.duration);

                if (activityEnd <= dataDate) {
                    // Entire activity should be completed by dataDate
                    pv += bac;
                } else {
                    // Partial progress based on elapsed time proportion
                    const totalDuration = activity.duration;
                    const elapsed = Math.floor((dataDate.getTime() - activity.startDate.getTime()) / (1000 * 60 * 60 * 24));
                    const timeProportion = Math.min(elapsed / totalDuration, 1);
                    pv += bac * timeProportion;
                }
            }

            // Earned Value (EV) based on actual percent complete
            ev += bac * (percentComplete / 100);

            // Actual Cost (AC)
            ac += actualCost;
        });

        const sv = ev - pv;
        const cv = ev - ac;
        const spi = pv > 0 ? ev / pv : 0;
        const cpi = ac > 0 ? ev / ac : 0;

        const totalBAC = activities.reduce((sum, a) => sum + (a.budgetAtCompletion ?? a.duration), 0);
        const eac = cpi > 0 ? totalBAC / cpi : totalBAC;
        const etc = eac - ac;
        const vac = totalBAC - eac;

        return {
            pv: Math.round(pv),
            ev: Math.round(ev),
            ac: Math.round(ac),
            sv: Math.round(sv),
            cv: Math.round(cv),
            spi: Math.round(spi * 100) / 100,
            cpi: Math.round(cpi * 100) / 100,
            bac: Math.round(totalBAC),
            eac: Math.round(eac),
            etc: Math.round(etc),
            vac: Math.round(vac)
        };
    }
}

