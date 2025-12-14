import { Injectable } from '@angular/core';
import { ProjectState, Activity, Dependency } from '../models/planning.models';

@Injectable({
    providedIn: 'root'
})
export class XerExporterService {

    constructor() { }

    export(projectState: ProjectState, projectName: string = 'Exported Project'): string {
        const lines: string[] = [];

        // Header
        lines.push('ERMHDR\t9.0\t2025-01-01\tASCII\t\t\t\t\t');
        lines.push('%T\tPROJECT');
        lines.push('%F\tproj_id\tproj_short_name\tproj_name\tplan_start_date\tplan_end_date');

        const projId = 1;
        const startDate = this.formatDate(projectState.projectStartDate);
        const endDate = this.formatDate(projectState.projectEndDate);
        const projShortName = projectName.substring(0, 20);
        const projFullName = projectName;

        lines.push(`%R\t${projId}\t${projShortName}\t${projFullName}\t${startDate}\t${endDate}`);
        lines.push('%E');

        // WBS (PROJWBS) - Extract unique parent IDs to create WBS hierarchy
        const wbsNodes = this.extractWBSNodes(projectState.activities);
        if (wbsNodes.length > 0) {
            lines.push('%T\tPROJWBS');
            lines.push('%F\twbs_id\tproj_id\twbs_name\twbs_short_name\tparent_wbs_id');

            wbsNodes.forEach(wbs => {
                const parentWbsId = wbs.parentWbsId || '';
                lines.push(`%R\t${wbs.wbsId}\t${projId}\t${wbs.name}\t${wbs.shortName}\t${parentWbsId}`);
            });

            lines.push('%E');
        }

        // Tasks (TASK)
        lines.push('%T\tTASK');
        lines.push('%F\ttask_id\tproj_id\twbs_id\ttask_name\ttask_type\ttarget_start_date\ttarget_end_date\ttarget_durn_qty\tphys_complete_pct');

        const tasks = projectState.activities.filter(a => !this.isWBSNode(a, projectState.activities));

        tasks.forEach(task => {
            const taskType = this.getTaskType(task);
            const startDate = this.formatDate(task.startDate);
            const endDate = new Date(task.startDate);
            endDate.setDate(endDate.getDate() + task.duration);
            const endDateStr = this.formatDate(endDate);
            const wbsId = this.getWBSIdForTask(task, projectState.activities);

            lines.push(`%R\t${task.id}\t${projId}\t${wbsId}\t${task.name}\t${taskType}\t${startDate}\t${endDateStr}\t${task.duration}\t${task.percentComplete || 0}`);
        });

        lines.push('%E');

        // Task Predecessors (TASKPRED)
        if (projectState.dependencies && projectState.dependencies.length > 0) {
            lines.push('%T\tTASKPRED');
            lines.push('%F\ttask_pred_id\ttask_id\tpred_task_id\tpred_type\tlag_durn_qty');

            projectState.dependencies.forEach((dep, index) => {
                const predType = this.getPredType(dep.type);
                const lag = dep.lag || 0;
                lines.push(`%R\t${index + 1}\t${dep.targetId}\t${dep.sourceId}\t${predType}\t${lag}`);
            });

            lines.push('%E');
        }

        return lines.join('\n');
    }

    private extractWBSNodes(activities: Activity[]): any[] {
        const wbsNodes: any[] = [];
        const wbsMap = new Map<number, Activity>();

        // Find all activities that are parents (WBS nodes)
        activities.forEach(activity => {
            const hasChildren = activities.some(a => a.parentId === activity.id);
            if (hasChildren) {
                wbsMap.set(activity.id, activity);
            }
        });

        // Convert to WBS format
        wbsMap.forEach((activity, id) => {
            const parentWbsId = activity.parentId && wbsMap.has(activity.parentId) ? activity.parentId : null;
            wbsNodes.push({
                wbsId: id,
                name: activity.name,
                shortName: activity.name.substring(0, 20),
                parentWbsId: parentWbsId
            });
        });

        return wbsNodes;
    }

    private isWBSNode(activity: Activity, allActivities: Activity[]): boolean {
        return allActivities.some(a => a.parentId === activity.id);
    }

    private getWBSIdForTask(task: Activity, allActivities: Activity[]): number {
        if (task.parentId) {
            const parent = allActivities.find(a => a.id === task.parentId);
            if (parent && this.isWBSNode(parent, allActivities)) {
                return task.parentId;
            }
        }
        return 1; // Default WBS
    }

    private getTaskType(activity: Activity): string {
        if (activity.type === 'FinishMilestone') return 'TT_FinMile';
        if (activity.type === 'StartMilestone') return 'TT_Mile';
        return 'TT_Task';
    }

    private getPredType(type: string): string {
        const typeMap: { [key: string]: string } = {
            'FS': 'PR_FS',
            'SS': 'PR_SS',
            'FF': 'PR_FF',
            'SF': 'PR_SF'
        };
        return typeMap[type] || 'PR_FS';
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day} 00:00`;
    }

    downloadXER(projectState: ProjectState, filename: string = 'project.xer') {
        const content = this.export(projectState, filename.replace('.xer', ''));
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    }
}
