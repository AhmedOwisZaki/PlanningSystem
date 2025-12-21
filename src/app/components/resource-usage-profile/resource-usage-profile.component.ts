
import { Component, Input, OnChanges, SimpleChanges, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectState, Resource, ResourceItem } from '../../models/planning.models';

@Component({
    selector: 'app-resource-usage-profile',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './resource-usage-profile.component.html',
    styleUrls: ['./resource-usage-profile.component.scss']
})
export class ResourceUsageProfileComponent implements OnChanges {
    @Input() projectState: ProjectState | null = null;
    @Input() startDate: Date = new Date();
    @Input() endDate: Date = new Date();
    @Input() dayWidth: number = 24;
    @Input() zoomLevel: number = 1;
    @Input() set scrollLeft(value: number) {
        this.currentScroll.set(value);
    }

    currentScroll = signal(0);

    // Use ViewChild to manipulate DOM if needed, or style binding.
    // Style binding [style.transform] on bars-wrapper in HTML is cleanest (GPU accel).

    // Signal for aggregation
    aggregatedData = signal<{ date: Date, total: number, safeTotal: number, overTotal: number, limit: number, isOver: boolean }[]>([]);

    // Calculate max value for Y-axis scaling
    maxUsage = computed(() => {
        const data = this.aggregatedData();
        if (data.length === 0) return 10;
        return Math.max(...data.map(d => Math.max(d.total, d.limit))) * 1.2; // Add 20% buffer
    });

    totalWidth = computed(() => {
        const count = this.aggregatedData().length;
        if (count === 0) return 0;
        // Ensure minimum screen width
        return Math.max(count * this.dayWidth * this.zoomLevel, 100);
    });

    @Input() selectedResourceId: number | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (this.projectState || changes['selectedResourceId']) {
            this.calculateUsage();
        }
    }

    private calculateUsage() {
        if (!this.projectState) return;

        const activities = this.projectState.activities;
        const resources = this.projectState.resources || [];

        // Determine limit: if selectedResource, use its limit. Else use sum of all.
        let limit = 0;
        if (this.selectedResourceId) {
            const res = resources.find(r => r.id === Number(this.selectedResourceId));
            limit = res ? (Number(res.maxAvailabilityUnitsPerDay) || Number(res.limit) || 0) : 0;
        } else {
            limit = resources.reduce((sum, r) => sum + (Number(r.maxAvailabilityUnitsPerDay) || Number(r.limit) || 0), 0);
        }

        // Map: DateStr -> Total Amount
        const usageMap = new Map<string, number>();

        const start = new Date(this.startDate);
        const end = new Date(this.endDate);

        activities.forEach(act => {
            if (!act.startDate || !act.resourceItems) return;

            for (let i = 0; i < act.duration; i++) {
                const current = new Date(act.startDate);
                current.setDate(current.getDate() + i);
                if (current < start || current > end) continue;

                const dateStr = current.toISOString().split('T')[0];

                // Calculate daily total based on selection (Distribute amount over duration)
                const duration = act.duration > 0 ? act.duration : 1;

                // Helper to check working days (Move this to class method if needed repeatedly)
                // Assuming project calendars are available in this.projectState.calendars
                const getCalendar = (act: any) => {
                    const state = this.projectState; // Capture to local var for TS narrowing
                    if (!state || !state.calendars) return null;

                    if (act.calendarId) {
                        return state.calendars.find(c => c.id === act.calendarId);
                    }
                    if (state.defaultCalendarId) {
                        return state.calendars.find(c => c.id === state.defaultCalendarId);
                    }
                    return null;
                };

                const calendar = getCalendar(act);

                const isWorkingDay = (d: Date, cal: any) => {
                    if (!cal) return true; // Default to working if no calendar
                    // Check Holidays
                    if (cal.holidays && cal.holidays.some((h: any) => new Date(h).toDateString() === d.toDateString())) {
                        return false;
                    }
                    // Check Weekend/WorkDays (0=Sun, 6=Sat)
                    const day = d.getDay();
                    // Cal.workDays is boolean array [Sun, Mon, ..., Sat]
                    if (cal.workDays && !cal.workDays[day]) {
                        return false;
                    }
                    return true;
                };

                // 1. Calculate Actual Working Days in range
                let workingDaysCount = 0;
                for (let k = 0; k < duration; k++) {
                    const tempDate = new Date(act.startDate);
                    tempDate.setDate(tempDate.getDate() + k);
                    if (isWorkingDay(tempDate, calendar)) {
                        workingDaysCount++;
                    }
                }

                if (workingDaysCount === 0) workingDaysCount = duration; // Fallback to avoid division by zero

                // 2. Distribute based on working days
                let dailyTotal = 0;
                if (isWorkingDay(current, calendar)) {
                    if (this.selectedResourceId) {
                        const items = act.resourceItems.filter(ri => ri.resourceId === Number(this.selectedResourceId));
                        // Avoid division by zero if workingDaysCount is somehow 0 (fallback to duration was handled above)
                        dailyTotal = items.reduce((acc, item) => acc + (item.amount / workingDaysCount), 0);
                    } else {
                        dailyTotal = act.resourceItems.reduce((acc, item) => acc + (item.amount / workingDaysCount), 0);
                    }
                } else {
                    dailyTotal = 0;
                }

                usageMap.set(dateStr, (usageMap.get(dateStr) || 0) + dailyTotal);
            }
        });

        // Generate Data Array for Timeline (filling gaps?)
        const data = [];
        const numDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

        for (let i = 0; i <= numDays; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const total = usageMap.get(dateStr) || 0;

            const safeTotal = Math.min(total, limit);
            const overTotal = total > limit ? total - limit : 0;

            data.push({
                date: d,
                total: total,
                safeTotal: safeTotal,
                overTotal: overTotal,
                limit: limit,
                isOver: total > limit
            });
        }

        this.aggregatedData.set(data);
    }

    getBarHeight(value: number): number {
        const max = this.maxUsage();
        return max > 0 ? (value / max) * 100 : 0;
    }

    getLeft(index: number): number {
        return index * this.dayWidth * this.zoomLevel;
    }
}
