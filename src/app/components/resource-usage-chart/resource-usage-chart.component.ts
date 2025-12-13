import { Component, Input, Output, EventEmitter, computed, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Resource, Activity } from '../../models/planning.models';

@Component({
    selector: 'app-resource-usage-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="modal-overlay" (click)="close.emit()">
            <div class="modal-content" (click)="$event.stopPropagation()">
                <div class="modal-header">
                    <h3>Resource Usage: {{ resource?.name }}</h3>
                    <div class="actions">
                        <button class="btn-print" (click)="printChart()">Print</button>
                        <button class="btn-close" (click)="close.emit()">×</button>
                    </div>
                </div>
                
                <div class="chart-container" *ngIf="chartData()">
                    <svg #chartSvg [attr.viewBox]="viewBox()" preserveAspectRatio="none">
                        <!-- Grid Lines -->
                        <line *ngFor="let tick of yTicks()" 
                              [attr.x1]="padding.left" 
                              [attr.y1]="tick.y" 
                              [attr.x2]="chartWidth() - padding.right" 
                              [attr.y2]="tick.y" 
                              stroke="#e0e0e0" stroke-width="1" />

                        <!-- Axis Lines -->
                        <line [attr.x1]="padding.left" [attr.y1]="chartHeight() - padding.bottom" 
                              [attr.x2]="chartWidth() - padding.right" [attr.y2]="chartHeight() - padding.bottom" 
                              stroke="black" stroke-width="1" />
                        <line [attr.x1]="padding.left" [attr.y1]="padding.top" 
                              [attr.x2]="padding.left" [attr.y2]="chartHeight() - padding.bottom" 
                              stroke="black" stroke-width="1" />

                        <!-- Area/Line Path -->
                        <path [attr.d]="pathData()" fill="rgba(51, 154, 240, 0.2)" stroke="#339af0" stroke-width="2"/>

                        <!-- X Axis Labels (Months) -->
                         <text *ngFor="let label of xLabels()" 
                              [attr.x]="label.x" 
                              [attr.y]="chartHeight() - padding.bottom + 20" 
                              text-anchor="middle" font-size="10">
                            {{ label.text }}
                        </text>

                         <!-- Y Axis Labels -->
                         <text *ngFor="let tick of yTicks()" 
                              [attr.x]="padding.left - 10" 
                              [attr.y]="tick.y + 4" 
                              text-anchor="end" font-size="10">
                            {{ tick.value }}
                        </text>
                    </svg>
                    
                    <div class="no-data" *ngIf="chartData().maxUsage === 0">
                        No usage data found for this resource.
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .modal-content {
            background: white;
            border-radius: 8px;
            width: 80%;
            height: 80%;
            max-width: 1200px;
            display: flex;
            flex-direction: column;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            
            h3 { margin: 0; }
            .actions {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            .btn-print {
                padding: 6px 16px;
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
            }
            .btn-print:hover { background: #5a6268; }
            .btn-close {
                background: none; border: none; font-size: 1.5rem; cursor: pointer;
                padding: 0 5px;
            }
        }
        .chart-container {
            flex: 1;
            position: relative;
            min-height: 0;
        }
        svg {
            width: 100%;
            height: 100%;
            overflow: visible;
        }
        .no-data {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            color: #888;
        }

        @media print {
            body { 
                visibility: hidden; 
                overflow: hidden; 
            }
            .modal-overlay {
                visibility: visible;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: white;
                z-index: 9999;
                align-items: flex-start;
            }
            .modal-overlay * {
                visibility: visible;
            }
            .modal-content {
                width: 100%;
                height: 100%;
                max-width: none;
                box-shadow: none;
                border: none;
            }
            .btn-close, .btn-print {
                display: none !important;
            }
            .chart-container {
                height: 100%;
            }
        }
    `],
    encapsulation: ViewEncapsulation.None
})
export class ResourceUsageChartComponent {
    @Input() resource: Resource | null = null;
    @Input() activities: Activity[] = [];
    @Input() projectStartDate: Date = new Date();
    @Input() projectEndDate: Date = new Date();
    @Output() close = new EventEmitter<void>();

    padding = { top: 20, right: 30, bottom: 40, left: 50 };
    chartHeight = signal(600);
    chartWidth = signal(1000);

    printChart() {
        window.print();
    }

    chartData = computed(() => {
        if (!this.resource || !this.activities) return { dailyUsage: [], maxUsage: 0, totalDays: 0 };

        const start = new Date(this.projectStartDate);
        const end = new Date(this.projectEndDate);
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const dailyUsage = new Array(totalDays + 1).fill(0);

        // Calculate usage
        this.activities.forEach(activity => {
            const items = activity.resourceItems || [];
            const useItem = items.find(i => i.resourceId === this.resource!.id);
            if (useItem && activity.startDate && activity.duration) {
                const actStart = new Date(activity.startDate);
                const offset = Math.ceil((actStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

                for (let i = 0; i < activity.duration; i++) {
                    const idx = offset + i;
                    if (idx >= 0 && idx < dailyUsage.length) {
                        dailyUsage[idx] += useItem.amount;
                    }
                }
            }
        });

        const maxUsage = Math.max(...dailyUsage, 1);
        return { dailyUsage, maxUsage, totalDays };
    });

    viewBox = computed(() => `0 0 ${this.chartWidth()} ${this.chartHeight()}`);

    pathData = computed(() => {
        const data = this.chartData();
        const usage = data.dailyUsage;
        const max = data.maxUsage * 1.1;
        const width = this.chartWidth() - this.padding.left - this.padding.right;
        const height = this.chartHeight() - this.padding.top - this.padding.bottom;

        const dayWidth = width / data.totalDays;

        let path = `M ${this.padding.left} ${this.chartHeight() - this.padding.bottom}`; // Move to origin

        usage.forEach((val, index) => {
            const x = this.padding.left + (index * dayWidth);
            const y = (this.chartHeight() - this.padding.bottom) - ((val / max) * height);
            path += ` L ${x} ${y}`;
        });

        path += ` L ${this.padding.left + (usage.length * dayWidth)} ${this.chartHeight() - this.padding.bottom}`;
        path += ` Z`;

        return path;
    });

    yTicks = computed(() => {
        const max = this.chartData().maxUsage * 1.1;
        const height = this.chartHeight() - this.padding.top - this.padding.bottom;
        const ticks = [];
        const count = 5;
        for (let i = 0; i <= count; i++) {
            const val = (max / count) * i;
            const y = (this.chartHeight() - this.padding.bottom) - ((val / max) * height);
            ticks.push({ value: Math.round(val), y });
        }
        return ticks;
    });

    xLabels = computed(() => {
        const start = new Date(this.projectStartDate);
        const labels = [];
        const width = this.chartWidth() - this.padding.left - this.padding.right;

        let current = new Date(start);
        current.setDate(1);

        while (current <= this.projectEndDate) {
            if (current >= this.projectStartDate) {
                const offsetTime = current.getTime() - this.projectStartDate.getTime();
                const totalTime = this.projectEndDate.getTime() - this.projectStartDate.getTime();
                const x = this.padding.left + (offsetTime / totalTime) * width;

                labels.push({
                    text: current.toLocaleString('default', { month: 'short', year: '2-digit' }),
                    x
                });
            }
            current.setMonth(current.getMonth() + 1);
        }
        return labels;
    });

}
