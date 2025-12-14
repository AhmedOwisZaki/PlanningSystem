import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanningService } from '../../services/planning.service';

@Component({
    selector: 'app-s-curves-chart',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './s-curves-chart.component.html',
    styleUrl: './s-curves-chart.component.scss'
})
export class SCurvesChartComponent {
    planningService = inject(PlanningService);

    chartData = computed(() => {
        const state = this.planningService.state();
        const startDate = state.projectStartDate;
        const endDate = state.projectEndDate;

        // Generate time-phased data (weekly intervals)
        const data: any[] = [];
        const currentDate = new Date(startDate);
        const weekMs = 7 * 24 * 60 * 60 * 1000;

        let cumulativePV = 0;
        let cumulativeEV = 0;
        let cumulativeAC = 0;

        while (currentDate <= endDate) {
            const evm = this.planningService.calculateEVM(currentDate);

            data.push({
                date: new Date(currentDate),
                pv: evm.pv,
                ev: evm.ev,
                ac: evm.ac
            });

            currentDate.setTime(currentDate.getTime() + weekMs);
        }

        return data;
    });

    maxValue = computed(() => {
        const data = this.chartData();
        if (data.length === 0) return 100;

        const max = Math.max(...data.map(d => Math.max(d.pv, d.ev, d.ac)));
        return Math.ceil(max * 1.1); // 10% padding
    });

    getX(index: number): number {
        const data = this.chartData();
        if (data.length <= 1) return 0;
        return (index / (data.length - 1)) * 100;
    }

    getY(value: number): number {
        const max = this.maxValue();
        if (max === 0) return 100;
        return 100 - (value / max) * 100;
    }

    getPathData(values: number[]): string {
        if (values.length === 0) return '';

        const points = values.map((value, index) => {
            const x = this.getX(index);
            const y = this.getY(value);
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    }

    getPVPath(): string {
        return this.getPathData(this.chartData().map(d => d.pv));
    }

    getEVPath(): string {
        return this.getPathData(this.chartData().map(d => d.ev));
    }

    getACPath(): string {
        return this.getPathData(this.chartData().map(d => d.ac));
    }

    formatDate(date: Date): string {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(value);
    }
}
