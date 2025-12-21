export interface Activity {
    id: number;
    name: string;
    startDate: Date;
    duration: number;
    percentComplete: number;
    parentId?: number | null;
    isExpanded?: boolean;
    resourceItems?: ResourceItem[];
    type?: 'Task' | 'StartMilestone' | 'FinishMilestone' | 'WBS';
    // Earned Value Management fields
    budgetAtCompletion?: number; // Planned total budget for the activity (BAC)
    actualCost?: number; // Actual cost incurred for the activity (AC)
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
    // Activity Steps (P6)
    steps?: ActivityStep[];
    earningType?: 'Duration' | 'Physical' | 'Steps';
    // Calendar
    calendarId?: number;
    // Activity Codes: Map of CodeDefinitionID -> CodeValueID
    assignedCodes?: { [definitionId: number]: number };
}

export interface ActivityStep {
    id: number;
    name: string;
    weight: number; // For weighted progress
    completed: boolean;
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
    projectId?: number;
    isDailyBasedResource?: boolean;
    isHourlyBasedResource?: boolean;
    maxAvailabilityUnitsPerDay?: number;
    maxAvailabilityUnitsPerHour?: number;
}

export interface ResourceType {
    id: number;
    name: string;
    description: string;
    projectId?: number;
}

export interface Calendar {
    id: number;
    name: string;
    isDefault: boolean;
    workDays: boolean[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
    workHoursPerDay: number;
    holidays: Date[];
    description?: string;
    projectId?: number;
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
    projectName?: string;
    projectDescription?: string;
    calendars?: Calendar[];
    defaultCalendarId?: number;
    projectBudget?: number;
    statusDate?: Date;
    projectId?: number; // For persistence tracking

    // Activity Codes
    activityCodeDefinitions?: ActivityCodeDefinition[];
}

export interface ActivityCodeDefinition {
    id: number;
    name: string; // e.g. "Location", "Phase"
    maxLength?: number;
    values: ActivityCodeValue[];
}

export interface ActivityCodeValue {
    id: number;
    codeId: number; // Link to definition
    value: string; // e.g. "Floor 1"
    description?: string;
    color?: string; // Optional for visualization
}

export interface EPSNode {
    id: string; // Unique ID (e.g., "EPS-1")
    name: string;
    parentId: string | null; // Null for root nodes
    children?: EPSNode[]; // For tree traversal (optional, can be built on the fly)
    projectIds?: number[]; // IDs of projects belonging to this node
}
