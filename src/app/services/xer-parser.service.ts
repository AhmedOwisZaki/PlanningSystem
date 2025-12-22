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
        const projectStartDate = this.parseDate(proj['plan_start_date']);
        const projectEndDate = this.parseDate(proj['plan_end_date']) || new Date(projectStartDate.getTime() + 30 * 24 * 3600 * 1000);

        // ID Mapping: P6 ID (string) -> Synthetic ID (number)
        const idMap = new Map<string, number>();
        let nextSyntheticId = 1;

        const allActivities: Activity[] = [];

        // 1. Process WBS Hierarchy (PROJWBS)
        const wbsNodes = tables['PROJWBS'] || [];
        // Sort by wbs_id to effectively process top-down if IDs are increasing?? No, P6 WBS IDs are random.
        // We can just process them. Parent resolution happens later if we need strict tree, but for list it's fine.
        // Wait, for parentId resolution, we need the parent to have an ID.
        // If we map ALL first, then resolve parents, it's safer.

        // Pass 1.1: Map all WBS IDs
        wbsNodes.forEach(wbs => {
            const syntheticId = nextSyntheticId++;
            idMap.set(wbs['wbs_id'], syntheticId);
        });

        // Pass 1.2: Create WBS Activities
        wbsNodes.forEach(wbs => {
            const syntheticId = idMap.get(wbs['wbs_id'])!;
            const parentP6Id = wbs['parent_wbs_id'];
            let parentId: number | null = null;

            if (parentP6Id && idMap.has(parentP6Id)) {
                parentId = idMap.get(parentP6Id)!;
            }

            allActivities.push({
                id: syntheticId,
                name: wbs['wbs_short_name'] || wbs['wbs_name'] || 'WBS Node',
                startDate: projectStartDate,
                duration: 0,
                percentComplete: 0,
                parentId: parentId,
                type: 'WBS', // Explicitly 'WBS' type
                isExpanded: true
            } as Activity);
        });

        // 2. Process Activities (TASK)
        const tasks = tables['TASK'] || [];

        // Pass 2.1: Map all Task IDs
        tasks.forEach(t => {
            const syntheticId = nextSyntheticId++;
            idMap.set(t['task_id'], syntheticId);
        });

        // Pass 2.2: Create Task Activities
        tasks.forEach(t => {
            const syntheticId = idMap.get(t['task_id'])!;
            const startDate = this.parseDate(t['target_start_date']) || projectStartDate;
            const endDate = this.parseDate(t['target_end_date']) || startDate;

            // Duration
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            let duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (duration === 0) duration = 1;

            // Type
            let type: any = 'Task';
            if (t['task_type'] === 'TT_FinMile') type = 'FinishMilestone';
            if (t['task_type'] === 'TT_Mile') type = 'StartMilestone';

            // Parent (WBS)
            const wbsP6Id = t['wbs_id'];
            let parentId: number | null = null;
            if (wbsP6Id && idMap.has(wbsP6Id)) {
                parentId = idMap.get(wbsP6Id)!;
            }

            allActivities.push({
                id: syntheticId,
                name: t['task_name'],
                startDate: startDate,
                duration: duration,
                percentComplete: parseInt(t['phys_complete_pct']) || 0,
                type: type,
                parentId: parentId
            } as Activity);
        });

        // 3. Process Relationships (TASKPRED)
        const preds = tables['TASKPRED'] || [];
        const dependencies: Dependency[] = [];

        preds.forEach((p, index) => {
            const sourceP6Id = p['pred_task_id'];
            const targetP6Id = p['task_id'];

            if (idMap.has(sourceP6Id) && idMap.has(targetP6Id)) {
                let type: any = 'FS';
                if (p['pred_type'] === 'PR_FS') type = 'FS';
                if (p['pred_type'] === 'PR_SS') type = 'SS';
                if (p['pred_type'] === 'PR_FF') type = 'FF';
                if (p['pred_type'] === 'PR_SF') type = 'SF';

                dependencies.push({
                    id: index + 10000,
                    sourceId: idMap.get(sourceP6Id)!,
                    targetId: idMap.get(targetP6Id)!,
                    type: type,
                    lag: parseInt(p['lag_durn_qty']) || 0
                });
            }
        });

        // 4. Process Resources (RSRC)
        const rsrcTable = tables['RSRC'] || [];
        const resources: any[] = [];
        const rsrcMap = new Map<string, number>();
        let nextResourceId = 1;

        rsrcTable.forEach(r => {
            const synId = nextResourceId++;
            rsrcMap.set(r['rsrc_id'], synId);

            resources.push({
                id: synId,
                name: r['rsrc_short_name'] || r['rsrc_name'],
                unit: r['unit_id'] || 'hr',
                costPerUnit: 0, // Simplified
                resourceTypeId: 1
            });
        });

        // 5. Process Assignments (TASKRSRC)
        const taskRsrcTable = tables['TASKRSRC'] || [];
        taskRsrcTable.forEach((tr, index) => {
            const p6TaskId = tr['task_id'];
            const p6RsrcId = tr['rsrc_id'];
            const amount = parseFloat(tr['target_qty']) || 0;

            if (idMap.has(p6TaskId) && rsrcMap.has(p6RsrcId)) {
                const activityId = idMap.get(p6TaskId)!;
                const resourceId = rsrcMap.get(p6RsrcId)!;

                // Attach to activity
                const activity = allActivities.find(a => a.id === activityId);
                if (activity) {
                    if (!activity.resourceItems) activity.resourceItems = [];
                    activity.resourceItems.push({
                        id: index + 1,
                        activityId: activityId,
                        resourceId: resourceId,
                        amount: amount
                    });
                }
            }
        });

        return {
            projectStartDate,
            projectEndDate,
            activities: allActivities,
            dependencies,
            resources: resources,
            projectName: proj['proj_short_name'] || proj['proj_name'] || 'Imported Project',
            projectDescription: proj['proj_name'] || 'Imported from Primavera P6'
        };
    }

    private parseDate(dateStr: string): Date {
        if (!dateStr) return new Date();
        return new Date(dateStr);
    }
}
