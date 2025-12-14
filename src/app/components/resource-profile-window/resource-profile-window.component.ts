import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PlanningService } from '../../services/planning.service';
import { ResourceUsageProfileComponent } from '../resource-usage-profile/resource-usage-profile.component';

@Component({
    selector: 'app-resource-profile-window',
    standalone: true,
    imports: [CommonModule, ResourceUsageProfileComponent],
    template: `
    <div class="window-container">
      <div class="header">
        <h2>Resource Usage: {{ resourceName() }}</h2>
        <button class="btn-print" (click)="print()">🖨️ Print</button>
      </div>
      <div class="content">
        <app-resource-usage-profile
            [projectState]="projectState()"
            [selectedResourceId]="selectedResourceId"
            [startDate]="projectStartDate()"
            [endDate]="projectEndDate()"
            [dayWidth]="40"
            [zoomLevel]="1"
            [scrollLeft]="0">
        </app-resource-usage-profile>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: white;
    }
    .window-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .header {
      padding: 1rem;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h2 { margin: 0; font-size: 1.2rem; color: #333; }
    .content {
      flex: 1;
      overflow: hidden; /* Component handles scrolling */
      display: flex;
    }
    app-resource-usage-profile {
      flex: 1;
    }
    .btn-print {
        padding: 6px 12px;
        cursor: pointer;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
    @media print {
        .header { display: none; }
    }
  `]
})
export class ResourceProfileWindowComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private planningService = inject(PlanningService);

    projectState = this.planningService.state;
    projectStartDate = this.planningService.projectStartDate;
    projectEndDate = this.planningService.projectEndDate;

    selectedResourceId: number | null = null;

    resourceName = computed(() => {
        if (!this.selectedResourceId) return 'Total Project';
        const r = this.projectState().resources?.find(res => res.id === this.selectedResourceId);
        return r ? r.name : 'Unknown Resource';
    });

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const id = params['resourceId'];
            this.selectedResourceId = id ? Number(id) : null;
        });
    }

    print() {
        window.print();
    }
}
