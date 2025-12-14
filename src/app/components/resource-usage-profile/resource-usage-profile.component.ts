
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
    aggregatedData = signal<{ date: Date, total: number, limit: number, isOver: boolean }[]>([]);

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
            limit = res ? (res.limit || 0) : 0;
        } else {
            limit = resources.reduce((sum, r) => sum + (r.limit || 0), 0);
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

                // Calculate daily total based on selection
                let dailyTotal = 0;
                if (this.selectedResourceId) {
                    const items = act.resourceItems.filter(ri => ri.resourceId === Number(this.selectedResourceId));
                    dailyTotal = items.reduce((acc, item) => acc + item.amount, 0);
                } else {
                    dailyTotal = act.resourceItems.reduce((acc, item) => acc + item.amount, 0);
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

            data.push({
                date: d,
                total: total,
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
