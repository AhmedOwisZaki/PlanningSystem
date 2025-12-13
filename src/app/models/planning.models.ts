export interface Activity {
    id: number;
    name: string;
    startDate: Date;
    duration: number;
    percentComplete: number;
    parentId?: number | null;
    isExpanded?: boolean;
    resourceItems?: ResourceItem[];
    type?: 'Task' | 'StartMilestone' | 'FinishMilestone';

    // CPM Calculated Fields
    earlyStart?: Date;
    earlyFinish?: Date;
    lateStart?: Date;
    lateFinish?: Date;
    totalFloat?: number;
    freeFloat?: number;
    isCritical?: boolean;

    // Baseline Fields
    baselineStartDate?: Date;
    baselineEndDate?: Date;
    // Leveling Fields
    levelingDelay?: number;
}

export interface ResourceItem {
    id: number;
    activityId: number;
    resourceId: number;
    amount: number;
}

export interface Resource {
    id: number;
    name: string;
    unit: string;
    costPerUnit: number;
    resourceTypeId: number;
    limit?: number; // Max units available per day
}
export interface ResourceType {
    id: number;
    name: string;
    description: string;
}

export interface Dependency {
    id: number;
    sourceId: number;
    targetId: number;
    type: 'FS' | 'FF' | 'SS' | 'SF';
    lag?: number; // Lag in days
}

export interface ProjectState {
    projectStartDate: Date;
    projectEndDate: Date;
    activities: Activity[];
    dependencies: Dependency[];
    resources?: Resource[];
    resourceTypes?: ResourceType[];
}
