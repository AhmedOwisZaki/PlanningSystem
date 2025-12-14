
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

    ngOnChanges(changes: SimpleChanges): void {
        if (this.projectState) {
            this.calculateUsage();
        }
    }

    private calculateUsage() {
        if (!this.projectState) return;

        const activities = this.projectState.activities;
        const resources = this.projectState.resources || [];
        // For now, aggregate ALL resources (sum of all units). 
        // In P6 you usually select a specific resource. 
        // Let's implement specific resource selection later, or default to "Total Labor" if types exist.
        // For this phase, we'll sum EVERYTHING (Scalar sum) or maybe just the first resource?
        // Better: Sum of all 'units' assuming they are fungible for the high level view, 
        // OR better, pick the first resource found in the project to demo, or visual sum.

        // Let's do: Sum of ALL defined resources' limits vs Sum of Assignments.
        // This gives a "Total Project Ease" view.

        const totalLimit = resources.reduce((sum, r) => sum + (r.limit || 0), 0);

        // Map: DateStr -> Total Amount
        const usageMap = new Map<string, number>();

        const start = new Date(this.startDate);
        const end = new Date(this.endDate);

        // Iterate all days? Or iterate activities?
        // Iterate activities is usually faster if sparse.

        activities.forEach(act => {
            if (!act.startDate || !act.resourceItems) return;

            for (let i = 0; i < act.duration; i++) {
                const current = new Date(act.startDate);
                current.setDate(current.getDate() + i);
                if (current < start || current > end) continue;

                const dateStr = current.toISOString().split('T')[0];
                const dailyTotal = act.resourceItems.reduce((acc, item) => acc + item.amount, 0);

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
                limit: totalLimit, // Using total project limit for now
                isOver: total > totalLimit // Simple Red/Green
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
