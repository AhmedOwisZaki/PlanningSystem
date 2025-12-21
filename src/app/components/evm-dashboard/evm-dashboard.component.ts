import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanningService } from '../../services/planning.service';

import { SCurvesChartComponent } from '../s-curves-chart/s-curves-chart.component';

@Component({
    selector: 'app-evm-dashboard',
    standalone: true,
    imports: [CommonModule, SCurvesChartComponent],
    templateUrl: './evm-dashboard.component.html',
    styleUrl: './evm-dashboard.component.scss'
})
export class EVMDashboardComponent {
    planningService = inject(PlanningService);

    evmMetrics = computed(() => {
        return this.planningService.calculateEVM();
    });

    getPerformanceClass(value: number, isIndex: boolean = false): string {
        if (isIndex) {
            if (value >= 1) return 'good';
            if (value >= 0.9) return 'warning';
            return 'bad';
        } else {
            if (value >= 0) return 'good';
            if (value >= -10) return 'warning';
            return 'bad';
        }
    }
}
