export interface Activity {
    id: number;
    name: string;
    startDate: Date;
    duration: number;
    percentComplete: number;
    parentId?: number | null;
    isExpanded?: boolean;
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
}
