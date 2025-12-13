export interface Activity {
    id: number;
    name: string;
    startDate: Date;
    duration: number;
    percentComplete: number;
    parentId?: number | null;
    isExpanded?: boolean;
    resourceItems?: ResourceItem[];
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
}

export interface ProjectState {
    projectStartDate: Date;
    projectEndDate: Date;
    activities: Activity[];
    dependencies: Dependency[];
    resources?: Resource[];
    resourceTypes?: ResourceType[];
}
