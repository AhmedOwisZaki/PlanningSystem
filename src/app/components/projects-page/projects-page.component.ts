import { Component, signal, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlanningService } from '../../services/planning.service';
import { XerParserService } from '../../services/xer-parser.service';

@Component({
    selector: 'app-projects-page',
    standalone: true,
    imports: [CommonModule, FormsModule],
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

    // State for Modals
    showCreateModal = false;
    showEditModal = false;

    // Project Form Data
    editingProject: any = { name: '', description: '' };
    newProjectData: any = { name: '', description: '' };
    selectedProjectForAction: number | null = null;

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

    private saveProjectsList() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('projects', JSON.stringify(this.projects()));
        }
    }

    // --- CREATE ---
    openCreateModal() {
        this.newProjectData = { name: 'New Project', description: '' };
        this.showCreateModal = true;
    }

    closeCreateModal() {
        this.showCreateModal = false;
    }

    createProject() {
        if (!this.newProjectData.name.trim()) return;

        const newId = Date.now();
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // Default 1 month

        // 1. Create Metadata for List
        const newProjectMeta = {
            id: newId,
            name: this.newProjectData.name,
            description: this.newProjectData.description,
            activityCount: 0,
            startDate: startDate,
            endDate: endDate
        };

        // 2. Create Initial State
        const initialState = {
            projectId: newId,
            projectName: this.newProjectData.name,
            projectDescription: this.newProjectData.description,
            projectStartDate: startDate,
            projectEndDate: endDate,
            activities: [],
            dependencies: [],
            resources: [],
            calendars: [{
                id: 1,
                name: 'Standard',
                isDefault: true,
                workDays: [false, true, true, true, true, true, false],
                workHoursPerDay: 8,
                holidays: []
            }],
            defaultCalendarId: 1
        };

        // 3. Save State to Storage
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(`project_${newId}`, JSON.stringify(initialState));
        }

        // 4. Update List
        this.projects.update(list => [...list, newProjectMeta]);
        this.saveProjectsList();

        this.closeCreateModal();
    }

    // --- EDIT ---
    openEditModal(project: any, event: Event) {
        event.stopPropagation();
        this.selectedProjectForAction = project.id;
        this.editingProject = { name: project.name, description: project.description };
        this.showEditModal = true;
    }

    closeEditModal() {
        this.showEditModal = false;
        this.selectedProjectForAction = null;
    }

    updateProject() {
        if (!this.selectedProjectForAction || !this.editingProject.name.trim()) return;

        const pid = this.selectedProjectForAction;

        // 1. Update List
        this.projects.update(list => list.map(p =>
            p.id === pid ? { ...p, name: this.editingProject.name, description: this.editingProject.description } : p
        ));
        this.saveProjectsList();

        // 2. Update Storage State (if it exists)
        if (isPlatformBrowser(this.platformId)) {
            const key = `project_${pid}`;
            const existing = localStorage.getItem(key);
            if (existing) {
                const state = JSON.parse(existing);
                state.projectName = this.editingProject.name;
                state.projectDescription = this.editingProject.description;
                // Preserve other data
                localStorage.setItem(key, JSON.stringify(state));
            }
        }

        this.closeEditModal();
    }

    // --- DELETE ---
    deleteProject(projectId: number, event: Event) {
        event.stopPropagation();
        if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) return;

        // 1. Remove from List
        this.projects.update(list => list.filter(p => p.id !== projectId));
        this.saveProjectsList();

        // 2. Remove from Storage
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem(`project_${projectId}`);
        }
    }

    // --- OPEN ---
    openProject(projectId: number) {
        if (isPlatformBrowser(this.platformId)) {
            // Try load specific state
            const key = `project_${projectId}`;
            const savedState = localStorage.getItem(key);

            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    // Fix dates
                    // (Assuming loadProjectState handles date parsing or we do it here. 
                    // Ideally PlanningService.loadProjectState should handle string->Date conversion safely)
                    // But let's do a quick pass if needed.
                    this.planningService.loadProjectState(state);
                } catch (e) {
                    console.error("Failed to load project state", e);
                    alert("Error loading project data. Check console.");
                    return;
                }
            } else {
                // Determine if it was the hardcoded demo project?
                // If it's ID 1 (Demo) and no storage, maybe we just initialize default service state?
                // Or if it's a legacy project not fully migrated.
                if (projectId === 1 && !savedState) {
                    // Just go to planning, it likely has default state.
                    // Or we should verify. 
                } else {
                    alert("Project data not found!");
                    return;
                }
            }
        }
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
                const newId = Date.now();
                // Add imported project to the list
                const newProject = {
                    id: newId,
                    name: (projectState as any).projectName || file.name.replace('.xer', ''),
                    description: (projectState as any).projectDescription || 'Imported from Primavera P6',
                    activityCount: projectState.activities.length,
                    startDate: projectState.projectStartDate,
                    endDate: projectState.projectEndDate
                };

                // Save State to Storage
                if (isPlatformBrowser(this.platformId)) {
                    // Include projectId
                    (projectState as any).projectId = newId;
                    localStorage.setItem(`project_${newId}`, JSON.stringify(projectState));
                }

                this.projects.update(projects => [...projects, newProject]);
                this.saveProjectsList();

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
