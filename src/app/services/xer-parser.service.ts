import { Injectable } from '@angular/core';
import { Activity, Dependency, ProjectState, ActivityStep } from '../models/planning.models';

@Injectable({
    providedIn: 'root'
})
export class XerParserService {

    constructor() { }

    parse(content: string): ProjectState | null {
        const lines = content.split(/\r?\n/);
        const tables: { [tableName: string]: any[] } = {};

        let currentTable = '';
        let currentFields: string[] = [];

        for (const line of lines) {
            if (line.startsWith('%T')) {
                currentTable = line.split('\t')[1].trim();
                tables[currentTable] = [];
            } else if (line.startsWith('%F')) {
                currentFields = line.split('\t').slice(1); // Skip %F
            } else if (line.startsWith('%R')) {
                const values = line.split('\t').slice(1);
                const row: any = {};
                currentFields.forEach((field, index) => {
                    row[field] = values[index];
                });
                tables[currentTable].push(row);
            }
        }

        // Extract Project Info
        const projects = tables['PROJECT'] || [];
        if (projects.length === 0) return null;

        const proj = projects[0];
        // P6 Dates often string: "2025-01-01 00:00"
        const projectStartDate = this.parseDate(proj['plan_start_date']);
        const projectEndDate = this.parseDate(proj['plan_end_date']) || new Date(projectStartDate.getTime() + 30 * 24 * 3600 * 1000);

        // Extract WBS Hierarchy (PROJWBS)
        const wbsNodes = tables['PROJWBS'] || [];
        const wbsMap = new Map<string, any>();
        const wbsToActivityId = new Map<string, number>();

        // Build WBS map
        wbsNodes.forEach(wbs => {
            wbsMap.set(wbs['wbs_id'], wbs);
        });

        // Create WBS activities (summary tasks)
        let activityIdCounter = 100000; // Start high to avoid conflicts with task IDs
        const wbsActivities: Activity[] = [];

        wbsNodes.forEach(wbs => {
            const activityId = activityIdCounter++;
            wbsToActivityId.set(wbs['wbs_id'], activityId);

            // Find parent WBS
            const parentWbsId = wbs['parent_wbs_id'];
            let parentActivityId: number | null = null;

            if (parentWbsId && wbsToActivityId.has(parentWbsId)) {
                parentActivityId = wbsToActivityId.get(parentWbsId)!;
            }

            wbsActivities.push({
                id: activityId,
                name: wbs['wbs_short_name'] || wbs['wbs_name'] || 'WBS Node',
                startDate: projectStartDate,
                duration: 0, // Will be calculated by rollup
                percentComplete: 0,
                parentId: parentActivityId,
                type: 'Task',
                isExpanded: true
            } as Activity);
        });

        // Extract Activities (TASK)
        const tasks = tables['TASK'] || [];
        const activities: Activity[] = tasks.map(t => {
            const startDate = this.parseDate(t['target_start_date']) || projectStartDate;
            const endDate = this.parseDate(t['target_end_date']) || startDate;

            // Duration in P6 is mostly calculated or stored as hours? 
            // Often 'target_durn_qty' (planned duration). P6 durations are usually hours * 10? No, usually hours.
            // Let's infer duration from dates for simplicity if field ambiguous, or look for 'target_durn_qty'.
            // Simple approach: Date diff
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            let duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (duration === 0) duration = 1; // Minimum

            // Determine Type
            let type: any = 'Task';
            if (t['task_type'] === 'TT_FinMile') type = 'FinishMilestone';
            if (t['task_type'] === 'TT_Mile') type = 'StartMilestone'; // Check P6 enums

            // Find parent WBS
            const taskWbsId = t['wbs_id'];
            let parentActivityId: number | null = null;

            if (taskWbsId && wbsToActivityId.has(taskWbsId)) {
                parentActivityId = wbsToActivityId.get(taskWbsId)!;
            }

            return {
                id: parseInt(t['task_id']),
                name: t['task_name'],
                startDate: startDate,
                duration: duration,
                percentComplete: parseInt(t['phys_complete_pct']) || 0,
                type: type,
                parentId: parentActivityId
            } as Activity;
        });

        // Combine WBS activities and task activities
        const allActivities = [...wbsActivities, ...activities];

        // Extract Relationships (TASKPRED)
        const preds = tables['TASKPRED'] || [];
        const dependencies: Dependency[] = preds.map((p, index) => {
            let type: any = 'FS';
            if (p['pred_type'] === 'PR_FS') type = 'FS';
            if (p['pred_type'] === 'PR_SS') type = 'SS';
            if (p['pred_type'] === 'PR_FF') type = 'FF';
            if (p['pred_type'] === 'PR_SF') type = 'SF';

            return {
                id: index + 1000,
                sourceId: parseInt(p['pred_task_id']),
                targetId: parseInt(p['task_id']),
                type: type,
                lag: parseInt(p['lag_durn_qty']) || 0 // Assuming basic unit
            };
        });

        // Hierarchy (PROJWBS) - Optional for now, flattened list
        // If we want WBS, we need PROJWBS table mapping wbs_id to parent_wbs_id 
        // and link TASK.wbs_id to PROJWBS.

        return {
            projectStartDate,
            projectEndDate,
            activities: allActivities,
            dependencies,
            projectName: proj['proj_short_name'] || proj['proj_name'] || 'Imported Project',
            projectDescription: proj['proj_name'] || 'Imported from Primavera P6'
        };
    }

    private parseDate(dateStr: string): Date {
        if (!dateStr) return new Date();
        // Handle P6 date format if weird, usually YYYY-MM-DD
        return new Date(dateStr);
    }
}
