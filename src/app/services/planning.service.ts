import { Injectable, signal, computed, WritableSignal, PLATFORM_ID, inject, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Activity, Dependency, ProjectState, ActivityStep, Calendar } from '../models/planning.models';
import { ApiService } from './api.service';
import { forkJoin, map, Observable, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PlanningService {
    private platformId = inject(PLATFORM_ID);

    // State Signals
    public state: WritableSignal<ProjectState> = signal({
        projectStartDate: new Date(),
        projectEndDate: new Date(),
        projectId: 0,
        projectName: '',
        activities: [],
        dependencies: [],
        resourceTypes: [],
        resources: [],
        calendars: [],
        defaultCalendarId: 0
    });

    // Selectors
    activities = computed(() => this.state().activities || []);
    dependencies = computed(() => this.state().dependencies || []);
    resources = computed(() => this.state().resources || []);
    projectStartDate = computed(() => this.state().projectStartDate);
    projectEndDate = computed(() => this.state().projectEndDate);

    resourceTypes = computed(() => this.state().resourceTypes || []);
    // Code Accessors
    activityCodeDefinitions = computed(() => this.state().activityCodeDefinitions || []);

    // Selected Activity (shared between components)
    selectedActivity = signal<Activity | null>(null);

    setSelectedActivity(activity: Activity | null) {
        this.selectedActivity.set(activity);
        if (activity) this.selectedDependency.set(null); // Deselect dependency if activity selected
    }

    // Selected Dependency
    selectedDependency = signal<Dependency | null>(null);

    setSelectedDependency(dependency: Dependency | null) {
        this.selectedDependency.set(dependency);
        if (dependency) this.selectedActivity.set(null); // Deselect activity if dependency selected
    }

    // Calendar Management
    private mapApiCalendar(c: any): Calendar {
        const dayMap: { [key: string]: number } = {
            'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
            'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
        };
        const getDayVal = (day: any) => typeof day === 'string' ? dayMap[day.toUpperCase()] : day;

        // Ensure we have 7 days, default to working Mon-Fri if missing
        let workDays = [false, true, true, true, true, true, false];
        if (c.workDays && c.workDays.length > 0) {
            const sorted = [...c.workDays].sort((a: any, b: any) => getDayVal(a.dayOfWeek) - getDayVal(b.dayOfWeek));
            // Only use if we actually got days back
            if (sorted.length === 7) {
                workDays = sorted.map((wd: any) => wd.isWorkDay);
            } else if (sorted.length > 0) {
                // If partial, map specifically to the right indices
                const fullDays = new Array(7).fill(false);
                sorted.forEach(wd => {
                    const idx = getDayVal(wd.dayOfWeek);
                    if (idx >= 0 && idx < 7) fullDays[idx] = wd.isWorkDay;
                });
                workDays = fullDays;
            }
        }

        return {
            ...c,
            holidays: (c.holidays || []).map((h: any) => new Date(h.date || h)),
            workDays: workDays
        };
    }

    addCalendar(calendar: Partial<Calendar>): Observable<Calendar> {
        if (!calendar.projectId) {
            calendar.projectId = this.state().projectId;
        }
        return this.apiService.createCalendar(calendar).pipe(
            map(createdCal => this.mapApiCalendar(createdCal)),
            tap(mapped => {
                this.state.update(current => ({
                    ...current,
                    calendars: [...(current.calendars || []), mapped]
                }));
            })
        );
    }

    updateCalendar(updatedCalendar: Calendar): Observable<Calendar> {
        return this.apiService.updateCalendar(updatedCalendar.id, updatedCalendar).pipe(
            map(savedCal => this.mapApiCalendar(savedCal)),
            tap(mapped => {
                this.state.update(current => ({
                    ...current,
                    calendars: (current.calendars || []).map(c => c.id === mapped.id ? mapped : c)
                }));
            })
        );
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
        // Use local date components for stable comparison avoiding timezone shifts
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        const checkStr = `${y}-${m}-${d}`;

        const isHoliday = calendar.holidays.some(h => {
            const hDate = new Date(h);
            const hy = hDate.getFullYear();
            const hm = (hDate.getMonth() + 1).toString().padStart(2, '0');
            const hd = hDate.getDate().toString().padStart(2, '0');
            return `${hy}-${hm}-${hd}` === checkStr;
        });

        return !isHoliday;
    }

    private addWorkDays(startDate: Date, days: number, calendar: Calendar): Date {
        let current = new Date(startDate);

        // Ensure start is valid work day
        while (!this.isWorkDay(current, calendar)) {
            current.setDate(current.getDate() + 1);
        }

        if (days <= 0) return current;

        // Exclusive Logic: Return date that is 'days' working days FROM start.
        // If Duration 1: Start Jan 1. End Jan 2 (Morning).
        // Iterate 'days' times.
        let remaining = days;
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

        // Ensure end date is valid work day BACKWARDS?
        // Usually endDate is Exclusive (Morning of next day).
        // If Jan 2 is End. Jan 1 is Last Work Day.

        while (!this.isWorkDay(current, calendar)) {
            current.setDate(current.getDate() - 1);
        }

        if (days <= 0) return current;

        // Iterate 'days' times backwards
        // If End Jan 2. Dur 1. Start Jan 1.
        let remaining = days;
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
            const lastProjectId = localStorage.getItem('last_opened_project_id');
            if (lastProjectId) {
                this.loadFullProject(Number(lastProjectId)).subscribe({
                    error: (err) => console.error('Failed to auto-load last project:', err)
                });
            }
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
                        id: Number(a.id),
                        parentId: a.parentId ? Number(a.parentId) : null,
                        startDate: new Date(a.startDate),
                        earlyStart: a.earlyStart ? new Date(a.earlyStart) : undefined,
                        earlyFinish: a.earlyFinish ? new Date(a.earlyFinish) : undefined,
                        lateStart: a.lateStart ? new Date(a.lateStart) : undefined,
                        lateFinish: a.lateFinish ? new Date(a.lateFinish) : undefined,
                        baselineStartDate: a.baselineStartDate ? new Date(a.baselineStartDate) : undefined,
                        baselineEndDate: a.baselineEndDate ? new Date(a.baselineEndDate) : undefined,
                        isExpanded: true
                    })),
                    dependencies: data.dependencies,
                    resources: data.resources,
                    calendars: data.calendars.map((c: any) => this.mapApiCalendar(c)),
                    resourceTypes: data.resourceTypes || [],
                    activityCodeDefinitions: []
                };

                this.state.set(newState);
                this.scheduleProject();

                // Persistence: Save last opened project ID
                if (isPlatformBrowser(this.platformId)) {
                    localStorage.setItem('last_opened_project_id', projectId.toString());
                }

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

    addActivity(parentId: number | null = null, name: string = 'New Activity', isWBS: boolean = false) {
        const startDate = new Date(this.state().projectStartDate);
        // Reset time to start of day for consistency or match project start exactly.
        startDate.setHours(8, 0, 0, 0); // Default to standard start time

        const duration = isWBS ? 1 : 5; // Default WBS to 1 day if forced, or 0? user said "min start, max end". 
        // If WBS, duration is calculated. Start with 1? Or 0. 
        // Previous code said 0. But for tasks, 5. 

        const newActivity = {
            name: name,
            startDate: startDate,
            duration: isWBS ? 0 : 5, // WBS 0, Task 5
            percentComplete: 0,
            parentId: parentId,
            projectId: this.state().projectId,
            type: isWBS ? 'WBS' : 'Task'
        };

        this.apiService.createActivity(newActivity).subscribe({
            next: (createdActivity) => {
                // Calculate implicit finish date for immediate display using project calendar
                const start = new Date(createdActivity.startDate);
                const dur = createdActivity.duration;
                const cal = this.getCalendar(createdActivity.calendarId);
                const finish = this.addWorkDays(start, dur, cal);

                const mappedActivity = {
                    ...createdActivity,
                    id: Number(createdActivity.id),
                    parentId: createdActivity.parentId ? Number(createdActivity.parentId) : null,
                    startDate: start,
                    // Ensure visual bar exists immediately
                    earlyStart: start,
                    earlyFinish: finish,
                    isExpanded: true
                };
                this.state.update(current => ({
                    ...current,
                    activities: [...current.activities, mappedActivity]
                }));

                // Trigger rollups immediately to update parents
                this.applyRollups();

                this.recalculateProjectBounds();
                if (parentId !== null) {
                    this.toggleExpand(parentId, true);
                }
            },
            error: (err) => console.error('Failed to create activity:', err)
        });
    }

    // Rollup Trigger
    private applyRollups() {
        const activities = [...this.state().activities];
        this.rollupWBS(activities);
        // Persist changes
        activities.filter(a => a.type === 'WBS').forEach(wbs => {
            this.apiService.updateActivity(wbs.id, wbs).subscribe({
                error: (err) => console.error(`Failed to sync rollup for ${wbs.id}`, err)
            });
        });
        this.state.update(s => ({ ...s, activities }));
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
                this.applyRollups();
            },
            error: (err) => console.error('Failed to delete activity:', err)
        });
    }

    updateActivity(updatedActivity: Activity) {
        // Enforce date consistency immediately for UI feedback
        const cal = this.getCalendar(updatedActivity.calendarId);
        updatedActivity.earlyStart = new Date(updatedActivity.startDate);
        updatedActivity.earlyFinish = this.addWorkDays(updatedActivity.earlyStart, updatedActivity.duration, cal);

        // Optimistic update? Or wait? Let's wait for now to be safe.
        this.apiService.updateActivity(updatedActivity.id, updatedActivity).subscribe({
            next: (savedProjectActivity) => {
                this.state.update(current => ({
                    ...current,
                    activities: current.activities.map(a => a.id === updatedActivity.id ? updatedActivity : a)
                }));
                this.recalculateProjectBounds();
                this.applyRollups();
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
        if (!resource.projectId) {
            resource.projectId = this.state().projectId;
        }
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

    deleteResource(id: number) {
        this.apiService.deleteResource(id).subscribe({
            next: (success) => {
                if (success) {
                    this.state.update(current => {
                        const updatedResources = (current.resources || []).filter(r => r.id !== id);
                        const updatedActivities = (current.activities || []).map(act => ({
                            ...act,
                            resourceItems: (act.resourceItems || []).filter((ri: any) => ri.resourceId !== id)
                        }));
                        return {
                            ...current,
                            resources: updatedResources,
                            activities: updatedActivities
                        };
                    });
                }
            },
            error: (err) => console.error('Failed to delete resource:', err)
        });
    }
    updateResource(resource: any) {
        this.apiService.updateResource(resource.id, resource).subscribe({
            next: (updatedResource) => {
                this.state.update(current => ({
                    ...current,
                    resources: (current.resources || []).map(r => r.id === updatedResource.id ? updatedResource : r)
                }));
            },
            error: (err) => console.error('Failed to update resource:', err)
        });
    }

    addResourceType(resourceType: any): Observable<any> {
        if (!resourceType.projectId) {
            resourceType.projectId = this.state().projectId;
        }
        return this.apiService.createResourceType(resourceType).pipe(
            tap(created => {
                this.state.update(current => ({
                    ...current,
                    resourceTypes: [...(current.resourceTypes || []), created]
                }));
            })
        );
    }

    updateResourceType(resourceType: any): Observable<any> {
        return this.apiService.updateResourceType(resourceType.id, resourceType).pipe(
            tap(updated => {
                this.state.update(current => ({
                    ...current,
                    resourceTypes: (current.resourceTypes || []).map(rt => rt.id === updated.id ? updated : rt)
                }));
            })
        );
    }

    deleteResourceType(id: number): Observable<any> {
        return this.apiService.deleteResourceType(id).pipe(
            tap(() => {
                this.state.update(current => ({
                    ...current,
                    resourceTypes: (current.resourceTypes || []).filter(rt => rt.id !== id),
                    // Also consider if any resources use this type, maybe reset them?
                    resources: (current.resources || []).map(r => r.resourceTypeId === id ? { ...r, resourceTypeId: 0 } : r)
                }));
            })
        );
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

    updateResourceAssignment(activityId: number, assignmentId: number, amount: number) {
        console.log('PlanningService: updateResourceAssignment', { activityId, assignmentId, amount });
        this.apiService.updateResourceAssignment(activityId, 0, { id: assignmentId, amount }).subscribe({
            next: (updatedAssignment) => {
                console.log('PlanningService: updateResourceAssignment success', updatedAssignment);
                this.state.update(current => {
                    const activities = current.activities.map(a => {
                        if (a.id !== activityId) return a;
                        const resourceItems = (a.resourceItems || []).map((item: any) =>
                            item.id === assignmentId ? updatedAssignment : item
                        );
                        return { ...a, resourceItems };
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
            error: (err) => console.error('Failed to update resource assignment:', err)
        });
    }

    removeResourceAssignment(activityId: number, assignmentId: number) {
        console.log('PlanningService: removeResourceAssignment', { activityId, assignmentId });
        this.apiService.removeResourceFromActivity(activityId, 0, assignmentId).subscribe({
            next: () => {
                console.log('PlanningService: removeResourceAssignment success');
                this.state.update(current => {
                    const activities = current.activities.map(a => {
                        if (a.id !== activityId) return a;
                        const resourceItems = (a.resourceItems || []).filter((item: any) =>
                            item.id !== assignmentId
                        );
                        return { ...a, resourceItems };
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
            error: (err) => console.error('Failed to remove resource assignment:', err)
        });
    }

    // WBS Hierarchy Methods
    getChildren(parentId: number): Activity[] {
        return this.state().activities.filter(a => a.parentId === parentId);
    }

    getLevel(activityId: number): number {
        const activity = this.state().activities.find(a => a.id == activityId);
        if (!activity || activity.parentId == null) return 0;
        return 1 + this.getLevel(activity.parentId);
    }

    toggleExpand(activityId: number, expanded?: boolean) {
        this.state.update(current => ({
            ...current,
            activities: current.activities.map(a =>
                a.id === activityId ? { ...a, isExpanded: expanded !== undefined ? expanded : !a.isExpanded } : a
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
            // Adjust project start to be a valid workday on this calendar for the baseline if no preds
            while (!this.isWorkDay(earlyStart, calendar)) {
                earlyStart.setDate(earlyStart.getDate() + 1);
            }

            let minEarlyFinish: Date | null = null;
            const preds = predecessors.get(id) || [];

            for (const dep of preds) {
                const src = actMap.get(dep.sourceId)!;
                if (!src.earlyFinish || !src.earlyStart) continue;

                const lag = (dep.lag || 0);

                if (dep.type === 'FS') {
                    let baseDate = new Date(src.earlyFinish);
                    while (!this.isWorkDay(baseDate, calendar)) {
                        baseDate.setDate(baseDate.getDate() + 1);
                    }
                    const potentialStart = this.addWorkDays(baseDate, lag, calendar);
                    if (potentialStart.getTime() > earlyStart.getTime()) earlyStart = potentialStart;
                } else if (dep.type === 'SS') {
                    const potentialStart = this.addWorkDays(src.earlyStart, lag, calendar);
                    if (potentialStart.getTime() > earlyStart.getTime()) earlyStart = potentialStart;
                } else if (dep.type === 'FF') {
                    const potentialFinish = this.addWorkDays(src.earlyFinish, lag, calendar);
                    if (!minEarlyFinish || potentialFinish.getTime() > minEarlyFinish.getTime()) minEarlyFinish = potentialFinish;
                } else if (dep.type === 'SF') {
                    const potentialFinish = this.addWorkDays(src.earlyStart, lag, calendar);
                    if (!minEarlyFinish || potentialFinish.getTime() > minEarlyFinish.getTime()) minEarlyFinish = potentialFinish;
                }
            }

            act.earlyStart = earlyStart;
            act.startDate = earlyStart;

            // Calculate Finish: Max of (Start + Duration) and any FF/SF constraints
            const standardFinish = this.addWorkDays(earlyStart, act.duration, calendar);
            act.earlyFinish = (minEarlyFinish && minEarlyFinish.getTime() > standardFinish.getTime()) ? minEarlyFinish : standardFinish;
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
                    let baseDate = this.subtractWorkDays(tgt.lateStart, lag, calendar);

                    // With exclusive dates, lateFinish of pred = lateStart of succ (if lag 0)
                    // No need to shift back 1 day manually.
                    // Just ensure baseDate lands on a valid work day if we were at a boundary.
                    while (!this.isWorkDay(baseDate, calendar)) {
                        baseDate.setDate(baseDate.getDate() - 1);
                    }
                    potentialFinish = baseDate;

                } else if (dep.type === 'SS') {
                    // Pred Start = Succ Start - Lag
                    // So Pred Late Start <= Succ Late Start - Lag
                    // Derived Late Finish from Late Start
                    // Pred Start = Succ Start - Lag
                    // So Pred Late Start <= Succ Late Start - Lag
                    // Derived Late Finish from Late Start
                    const lateStartLim = this.subtractWorkDays(tgt.lateStart, lag, calendar);
                    potentialFinish = this.addWorkDays(lateStartLim, act.duration, calendar);
                } else if (dep.type === 'FF') {
                    // Pred Finish = Succ Finish - Lag
                    potentialFinish = this.subtractWorkDays(tgt.lateFinish!, lag, calendar);
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

        // Persist WBS changes (Dates/Percent)
        activities.filter(a => a.type === 'WBS').forEach(wbs => {
            // Check if changed from state? Or just update all WBS?
            // Ideally we only update if changed. But simpler to just update for now or check dirty flag.
            // Let's rely on the fact that we just computed it.
            this.apiService.updateActivity(wbs.id, wbs).subscribe({
                error: (err) => console.error(`Failed to sync WBS ${wbs.id}:`, err)
            });
        });

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
            const cal = this.getCalendar(a.calendarId);
            const end = start ? this.addWorkDays(start, a.duration || 1, cal) : null;

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

        // Process strictly bottom-up
        for (const { a } of activitieswithLevel) {
            // Find children in current activities list
            const children = activities.filter(child => child.parentId === a.id);

            if (children.length > 0) {
                // It's a summary task
                let minStart: Date | null = null;
                let maxEnd: Date | null = null;

                children.forEach(child => {
                    // Use calculated dates if available (earlyStart/earlyFinish), otherwise fallback to scheduled
                    const s = child.earlyStart ? new Date(child.earlyStart) : (child.startDate ? new Date(child.startDate) : null);
                    // For finish, we want the calculated finish date
                    const cal = this.getCalendar(child.calendarId);
                    const e = child.earlyFinish ? new Date(child.earlyFinish) : (child.startDate ? this.addWorkDays(new Date(child.startDate), child.duration, cal) : null);

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
                    a.earlyFinish = maxEnd!;
                    if (a.lateFinish && maxEnd > (a.lateFinish as any)) a.lateFinish = maxEnd; // Ensure container fits

                    // Calculate Duration: (Finish - Start) 
                    // Note: This is "Calendar Duration" effectively, or just simple envelope. 
                    // In P6, WBS Duration is usually time-span. 
                    const diffTime = (maxEnd as Date).getTime() - (minStart as Date).getTime();
                    a.duration = Math.ceil(diffTime / (1000 * 3600 * 24)); // Days approximation

                    // Rollup Progress (Weighted by Duration * Percent)
                    // If Duration is 0 (milestones), we ignore for weighting usually? Or Count?
                    let totalWeight = 0;
                    let earnedWeight = 0;
                    children.forEach(c => {
                        const weight = c.duration > 0 ? c.duration : 1; // Default to 1 for milestones
                        totalWeight += weight;
                        earnedWeight += weight * (c.percentComplete || 0);
                    });
                    a.percentComplete = totalWeight > 0 ? Math.round(earnedWeight / totalWeight) : 0;
                }
            }
        }
    }


    // Baseline Management
    assignBaseline() {
        this.state.update(current => {
            const activities = current.activities.map(a => {
                const cal = this.getCalendar(a.calendarId);
                return {
                    ...a,
                    baselineStartDate: a.startDate ? new Date(a.startDate) : undefined,
                    baselineEndDate: a.startDate ? this.addWorkDays(new Date(a.startDate), a.duration, cal) : undefined
                };
            });
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
                const cal = this.getCalendar(a.calendarId);
                const end = this.addWorkDays(start, a.duration, cal);
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

                        // Ensure valid workday on TARGET calendar
                        while (!this.isWorkDay(potentialStart, calendar)) {
                            potentialStart.setDate(potentialStart.getDate() + 1);
                        }
                        // Add Lag
                        potentialStart = this.addWorkDays(potentialStart, p.lag || 0, calendar);

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
        const activities = this.state().activities;
        const act = activities.find(a => a.id == activityId);
        if (act?.type === 'WBS') return true;
        return activities.some(a => a.parentId == activityId);
    }

    // EVM Calculation
    // EVM Calculation
    calculateEVM(statusDate?: Date): any {
        const dataDate = statusDate || new Date();
        const activities = this.activities();
        const resources = this.resources();
        const resMap = new Map(resources.map(r => [r.id, r]));

        let pv = 0, ev = 0, ac = 0;
        const currentStatusDate = this.state().statusDate || new Date();

        activities.forEach(activity => {
            // SKIP Parents/WBS to avoid double-counting costs (Rollups are calculated from leaves)
            if (this.isParent(activity.id)) return;

            // Calculate BAC based on resources if not explicitly set
            let bac = activity.budgetAtCompletion ?? 0;
            if (bac === 0 && activity.resourceItems && activity.resourceItems.length > 0) {
                activity.resourceItems.forEach((ri: any) => {
                    const res = resMap.get(ri.resourceId);
                    if (res) {
                        bac += (ri.amount || 0) * (res.costPerUnit || 0);
                    }
                });
            }

            // Fallback to duration for visibility if no budget or resources removed
            // if (bac === 0) bac = activity.duration;

            const currentEV = bac * ((activity.percentComplete ?? 0) / 100);
            // AC: If resources exist, sum them. Otherwise use actualCost field.
            let activityAC = activity.actualCost ?? 0;
            if (activity.resourceItems && activity.resourceItems.length > 0) {
                // Note: actualCost on the activity might be a manual override or sum from backend.
                // To match s-curve exactly we should be consistent. 
                // For simplicity, if actualCost is 0, we could estimate or just use the field.
                // Logic check: typically actualCost is synced.
            }

            const calendar = this.getCalendar(activity.calendarId);

            // 1. Planned Value (PV) - Calendar Aware
            if (activity.startDate <= dataDate) {
                let totalWorkDays = 0;
                let passedWorkDays = 0;

                for (let i = 0; i < activity.duration; i++) {
                    const d = new Date(activity.startDate);
                    d.setDate(d.getDate() + i);
                    if (this.isWorkDay(d, calendar)) {
                        totalWorkDays++;
                        if (d <= dataDate) {
                            passedWorkDays++;
                        }
                    }
                }

                if (totalWorkDays > 0) {
                    pv += bac * (passedWorkDays / totalWorkDays);
                } else if (activity.duration === 0) {
                    pv += bac;
                }
            }

            // 2. Earned Value (EV) & Actual Cost (AC) - Interpolated Trends
            if (dataDate <= activity.startDate) {
                ev += 0;
                ac += 0;
            } else if (dataDate >= currentStatusDate) {
                ev += currentEV;
                ac += activityAC;
            } else {
                const totalRange = currentStatusDate.getTime() - activity.startDate.getTime();
                const elapsed = dataDate.getTime() - activity.startDate.getTime();

                const factor = totalRange > 0 ? elapsed / totalRange : 1;
                ev += currentEV * factor;
                ac += activityAC * factor;
            }
        });

        const sv = ev - pv;
        const cv = ev - ac;
        const spi = pv > 0 ? ev / pv : 0;
        const cpi = ac > 0 ? ev / ac : 0;

        // Recalculate totalBAC using the same logic for consistency
        const totalBAC = activities.reduce((sum, activity) => {
            if (this.isParent(activity.id)) return sum; // Skip parents

            let abac = activity.budgetAtCompletion ?? 0;
            if (abac === 0 && activity.resourceItems && activity.resourceItems.length > 0) {
                activity.resourceItems.forEach((ri: any) => {
                    const res = resMap.get(ri.resourceId);
                    if (res) abac += (ri.amount || 0) * (res.costPerUnit || 0);
                });
            }
            // if (abac === 0) abac = activity.duration;
            return sum + abac;
        }, 0);

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

    updateProjectStartDate(newDate: Date) {
        this.state.update(s => ({ ...s, projectStartDate: newDate }));
        this.scheduleProject();
    }
}

