import { Component, signal, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { PlanningService } from '../../services/planning.service';
import { XerParserService } from '../../services/xer-parser.service';

@Component({
    selector: 'app-projects-page',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './projects-page.component.html',
    styleUrl: './projects-page.component.scss'
})
export class ProjectsPageComponent {
    private platformId = inject(PLATFORM_ID);

    projects = signal([
        {
            id: 1,
            name: 'Demo Project',
            description: 'Sample planning project with P6 features',
            activityCount: 100,
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-12-31')
        }
    ]);

    constructor(
        private router: Router,
        private planningService: PlanningService,
        private xerParser: XerParserService
    ) {
        // Load projects from localStorage (only in browser)
        if (isPlatformBrowser(this.platformId)) {
            this.loadProjects();
        }
    }

    private loadProjects() {
        const saved = localStorage.getItem('projects');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Convert date strings back to Date objects
                const projects = parsed.map((p: any) => ({
                    ...p,
                    startDate: new Date(p.startDate),
                    endDate: new Date(p.endDate)
                }));
                this.projects.set(projects);
            } catch (e) {
                console.error('Failed to load projects from localStorage', e);
            }
        }
    }

    private saveProjects() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('projects', JSON.stringify(this.projects()));
        }
    }

    openProject(projectId: number) {
        // Navigate to planning view
        this.router.navigate(['/planning']);
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            const projectState = this.xerParser.parse(content);

            if (projectState) {
                // Add imported project to the list
                const newProject = {
                    id: Date.now(),
                    name: (projectState as any).projectName || file.name.replace('.xer', ''),
                    description: (projectState as any).projectDescription || 'Imported from Primavera P6',
                    activityCount: projectState.activities.length,
                    startDate: projectState.projectStartDate,
                    endDate: projectState.projectEndDate
                };

                this.projects.update(projects => [...projects, newProject]);
                this.saveProjects();

                // Load the imported project into the planning service
                this.planningService.loadProjectState(projectState);

                // Navigate to the planning view
                this.router.navigate(['/planning']);
            } else {
                alert('Failed to parse XER file. Please check the file format.');
            }
        };

        reader.readAsText(file);
    }

    triggerFileInput() {
        const fileInput = document.getElementById('xerFileInput') as HTMLInputElement;
        fileInput?.click();
    }
}
