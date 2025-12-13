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
        ]
    });

    // Selectors
    activities = computed(() => this.state().activities);
    dependencies = computed(() => this.state().dependencies);
    resources = computed(() => this.state().resources);
    projectStartDate = computed(() => this.state().projectStartDate);
    projectEndDate = computed(() => this.state().projectEndDate);

    resourceTypes = computed(() => this.state().resourceTypes);

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
        this.assignMockResources();
        // Save initial state
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

    updateDependency(id: number, updates: Partial<Dependency>) {
        this.state.update(current => ({
            ...current,
            dependencies: current.dependencies.map(d => d.id === id ? { ...d, ...updates } : d)
        }));
    }

    addResource(resource: any) {
        const currentResources = this.state().resources || [];
        const newId = currentResources.length > 0 ? Math.max(...currentResources.map(r => r.id)) + 1 : 101;

        this.state.update(current => ({
            ...current,
            resources: [...(current.resources || []), { ...resource, id: newId }]
        }));
    }

    assignResourceToActivity(activityId: number, resourceId: number, amount: number) {
        let updatedActivity: Activity | undefined;

        this.state.update(current => {
            const activities = current.activities.map(a => {
                if (a.id !== activityId) return a;

                const currentItems = a.resourceItems || [];
                const newItem = {
                    id: Date.now(),
                    activityId: activityId,
                    resourceId: resourceId,
                    amount: amount
                };

                updatedActivity = { ...a, resourceItems: [...currentItems, newItem] };
                return updatedActivity;
            });
            return { ...current, activities };
        });

        // Update selectedActivity if it matches the one we just modified
        const currentSelected = this.selectedActivity();
        if (currentSelected && currentSelected.id === activityId && updatedActivity) {
            this.selectedActivity.set(updatedActivity);
        }

        this.saveToHistory();
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
            // Milestone Logic: Enforce 0 duration if Milestone
            if (act.type === 'StartMilestone' || act.type === 'FinishMilestone') {
                act.duration = 0;
            }

            if (this.isParent(id)) return; // Skip summaries for logic

            let earlyStart = new Date(projectStart);

            const preds = predecessors.get(id) || [];
            preds.forEach(dep => {
                const src = actMap.get(dep.sourceId)!;
                if (!src.earlyFinish) return;

                let potentialStart = new Date(src.earlyFinish);
                const lag = (dep.lag || 0);

                if (dep.type === 'FS') {
                    potentialStart = new Date(src.earlyFinish);
                } else if (dep.type === 'SS') {
                    potentialStart = new Date(src.earlyStart!);
                } else if (dep.type === 'FF') {
                    const finishDate = new Date(src.earlyFinish);
                    finishDate.setDate(finishDate.getDate() + lag);
                    const derivedStart = new Date(finishDate);
                    // For milestones, duration is 0, so derivedStart = finishDate
                    derivedStart.setDate(derivedStart.getDate() - act.duration);
                    potentialStart = derivedStart;
                }

                if (dep.type !== 'FF') {
                    potentialStart.setDate(potentialStart.getDate() + lag);
                }

                if (potentialStart > earlyStart) {
                    earlyStart = potentialStart;
                }
            });

            act.earlyStart = earlyStart;
            act.startDate = earlyStart;

            const earlyFinish = new Date(earlyStart);
            earlyFinish.setDate(earlyFinish.getDate() + act.duration);
            act.earlyFinish = earlyFinish;
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

            let lateFinish = new Date(projectFinish);
            const succs = successors.get(id) || [];
            if (succs.length > 0) {
                lateFinish = new Date(8640000000000000); // Far future
            }

            succs.forEach(dep => {
                const tgt = actMap.get(dep.targetId)!;
                if (!tgt.lateStart) return;

                let potentialFinish = new Date(tgt.lateStart);
                const lag = (dep.lag || 0);

                if (dep.type === 'FS') {
                    potentialFinish = new Date(tgt.lateStart);
                    potentialFinish.setDate(potentialFinish.getDate() - lag);
                } else if (dep.type === 'SS') {
                    const derivedStart = new Date(tgt.lateStart);
                    derivedStart.setDate(derivedStart.getDate() - lag);
                    potentialFinish = new Date(derivedStart);
                    potentialFinish.setDate(potentialFinish.getDate() + act.duration);
                }

                if (potentialFinish < lateFinish) {
                    lateFinish = potentialFinish;
                }
            });

            act.lateFinish = lateFinish;
            const lateStart = new Date(lateFinish);
            lateStart.setDate(lateStart.getDate() - act.duration);
            act.lateStart = lateStart;

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

        this.saveToHistory();
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

    updateActivityType(id: number, type: 'Task' | 'StartMilestone' | 'FinishMilestone') {
        this.state.update(current => ({
            ...current,
            activities: current.activities.map(a => a.id === id ? { ...a, type } : a)
        }));
        this.saveToHistory();
    }

    // Baseline Management
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

        const canSchedule = (act: Activity, startDate: Date): boolean => {
            if (!act.resourceItems || act.resourceItems.length === 0) return true;
            for (let i = 0; i < act.duration; i++) {
                const currentDay = new Date(startDate);
                currentDay.setDate(currentDay.getDate() + i);
                const dateStr = currentDay.toISOString().split('T')[0];
                for (const item of act.resourceItems) {
                    const limit = resourceLimits.get(item.resourceId) || 1;
                    const used = getUsed(item.resourceId, dateStr);
                    if (used + item.amount > limit) return false;
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
        // Note: If circular dependencies exist or logic flaw, might hang. Add safety.
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

            // Make sure we only process nodes whose preds are ALL scheduled
            // Double check validity (queue might have been added to eagerly?)
            // Actually, the logic below ensures we only add to queue when all preds done.
            // But initial population needs to cover cases where preds might be summaries? 
            // Limitation: We ignore summaries in leveling. So if A -> Summary -> B, we break chain?
            // Current CPM logic does not usually link summaries directly. Relationships are on tasks.

            // Pop highest priority
            const act = eligibleQueue.shift()!;

            // Double check: if it was already scheduled? (Shouldn't be)
            if (scheduledIds.has(act.id)) continue;

            // Calculate Effective Start (based on predecessors' LEVELED finish)
            let effectiveStart = new Date(act.earlyStart || act.startDate);
            const preds = state.dependencies.filter(d => d.targetId === act.id);
            preds.forEach(p => {
                const source = activityMap.get(p.sourceId);
                if (source && (scheduledIds.has(source.id) || source.type?.includes('Milestone'))) {
                    const sourceFinish = new Date(source.startDate);
                    sourceFinish.setDate(sourceFinish.getDate() + source.duration);

                    // Assuming FS Logic for now
                    if (p.type === 'FS') {
                        if (sourceFinish > effectiveStart) effectiveStart = sourceFinish;
                    }
                    // Add other types if needed (SS etc)
                }
            });

            // Find Slot
            let testStart = new Date(effectiveStart);
            let delayed = false;
            let attempts = 0;
            // Limit lookahead to prevent infinite loop
            while (!canSchedule(act, testStart) && attempts < 365) {
                testStart.setDate(testStart.getDate() + 1);
                delayed = true;
                attempts++;
            }

            // Commit
            if (act.resourceItems) {
                for (let i = 0; i < act.duration; i++) {
                    const currentDay = new Date(testStart);
                    currentDay.setDate(currentDay.getDate() + i);
                    const dateStr = currentDay.toISOString().split('T')[0];
                    for (const item of act.resourceItems) {
                        addUsage(item.resourceId, dateStr, item.amount);
                    }
                }
            }

            // Update
            act.startDate = testStart;
            const es = new Date(act.earlyStart || act.startDate);
            // Fix TS Error via cast
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
                        // If pred is a summary or milestone, we treat it as done? 
                        // Or we should have included milestones in scheduling?
                        // If milestone, we don't level it, but it exists.
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

        // Handle Milestones (just update dates based on preds, no resource check)
        // Or re-run scheduleProject() respecting the forced dates? 
        // Better: rollupWBS handles summaries. Milestones need to be updated? 
        // Re-running scheduleProject with 'imposed' dates is complex.

        // Let's just rollup WBS. Milestones might be out of sync if they depended on leveled tasks.
        // Simple fix: simple forward pass for milestones/non-leveled items.

        this.rollupWBS(activities);

        // Recalculate Project End Date (Calendar Bars coverage)
        let maxEnd = new Date(state.projectStartDate);
        activities.forEach(a => {
            const finish = new Date(a.startDate);
            finish.setDate(finish.getDate() + a.duration);
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
}
