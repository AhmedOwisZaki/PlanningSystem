import { Component, signal, PLATFORM_ID, inject, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlanningService } from '../../services/planning.service';
import { XerParserService } from '../../services/xer-parser.service';
import { EPSService } from '../../services/eps.service';
import { EPSNode } from '../../models/planning.models';

@Component({
    selector: 'app-projects-page',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './projects-page.component.html',
    styleUrl: './projects-page.component.scss'
})
export class ProjectsPageComponent {
    private platformId = inject(PLATFORM_ID);

    // EPS Data
    epsNodes = signal<EPSNode[]>([]);
    flattenedEPS = computed(() => {
        const nodes = this.epsNodes();
        const result: any[] = [];
        const traverse = (list: EPSNode[], level: number) => {
            for (const node of list) {
                // Add node with special name for indentation
                const indent = '—'.repeat(level);
                result.push({ ...node, displayName: `${indent} ${node.name}`, children: undefined });
                if (node.children) {
                    traverse(node.children, level + 1);
                }
            }
        };
        traverse(nodes, 0);
        return result;
    });

    projects = signal<any[]>([]); // Raw project list

    // View State
    selectedEPSIdForCreate: string = '';
    selectedEPSId: string | null = null; // Currently selected node for actions
    collapsedEPSNodes = signal<Set<string>>(new Set());

    // State for Modals
    showCreateModal = false;
    showEditModal = false;

    // ...

    // --- VIEW ACTIONS ---
    selectEPS(nodeId: string) {
        this.selectedEPSId = this.selectedEPSId === nodeId ? null : nodeId;
    }

    toggleCollapse(nodeId: string, event: Event) {
        event.stopPropagation();
        this.collapsedEPSNodes.update(current => {
            const next = new Set(current);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }

    isCollapsed(nodeId: string): boolean {
        return this.collapsedEPSNodes().has(nodeId);
    }

    // ...

    // --- CREATE PROJECT ---
    openCreateModal() {
        if (!this.selectedEPSId) return; // Should be handled by button disable state too

        this.newProjectData = {
            name: 'New Project',
            description: '',
            epsId: this.selectedEPSId
        };
        this.showCreateModal = true;
    }

    // EPS Management Modal
    showEPSModal = false;
    newEPSName = '';
    selectedParentEPSId: string | null = null; // For adding child EPS

    // Project Form Data
    editingProject: any = { name: '', description: '' };
    newProjectData: any = { name: '', description: '', epsId: '' };
    selectedProjectForAction: number | null = null;

    constructor(
        private router: Router,
        private planningService: PlanningService,
        private xerParser: XerParserService,
        private epsService: EPSService
    ) {
        // Load data on init
        if (isPlatformBrowser(this.platformId)) {
            this.loadProjects();
            // Subscribe to EPS updates
            this.epsService.epsNodes$.subscribe(nodes => {
                this.epsNodes.set(nodes);
            });
        }
    }

    private loadProjects() {
        // 1. Load from LocalStorage
        const saved = localStorage.getItem('projects');
        let loadedProjects: any[] = [];
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                loadedProjects = parsed.map((p: any) => ({
                    ...p,
                    startDate: new Date(p.startDate),
                    endDate: new Date(p.endDate)
                }));
            } catch (e) {
                console.error('Failed to load projects', e);
            }
        }

        // 2. Sync active project from Service (Reference Project)
        const activeState = this.planningService.state();
        const activeId = activeState.projectId;

        // Check if active project is already in text list
        const exists = loadedProjects.some(p => p.id === activeId);

        if (!exists) {
            // Add it
            const newMeta = {
                id: activeId,
                name: activeState.projectName,
                description: activeState.projectDescription || 'Default Reference Project',
                activityCount: activeState.activities ? activeState.activities.length : 0,
                startDate: activeState.projectStartDate,
                endDate: activeState.projectEndDate,
                epsId: '' // Default to unassigned or set a default EPS
            };

            loadedProjects.push(newMeta);

            // Persist list
            localStorage.setItem('projects', JSON.stringify(loadedProjects));

            // active state is already in memory, but ensure it's saved as project_ID too 
            localStorage.setItem(`project_${activeId}`, JSON.stringify(activeState));
        }

        this.projects.set(loadedProjects);
    }

    getProjectsForEPS(epsId: string) {
        return this.projects().filter(p => p.epsId === epsId);
    }

    getUnassignedProjects() {
        // Create a set of valid IDs from the flattened list (more efficient than re-traversing)
        const validEpsIds = new Set(this.flattenedEPS().map(node => node.id));
        return this.projects().filter(p => !p.epsId || !validEpsIds.has(p.epsId));
    }

    private saveProjectsList() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('projects', JSON.stringify(this.projects()));
        }
    }

    // --- EPS MANAGEMENT ---
    openAddEPSModal(parentId: string | null) {
        this.selectedParentEPSId = parentId;
        this.newEPSName = '';
        this.showEPSModal = true;
    }

    closeEPSModal() {
        this.showEPSModal = false;
    }

    createEPS() {
        if (!this.newEPSName.trim()) return;

        const newNode: EPSNode = {
            id: `EPS-${Date.now()}`,
            name: this.newEPSName,
            parentId: this.selectedParentEPSId,
            children: []
        };

        this.epsService.addEPSNode(newNode);
        this.closeEPSModal();
    }

    deleteEPS(nodeId: string, event: Event) {
        event.stopPropagation();
        if (!confirm('Are you sure you want to delete this EPS node? All projects under it will be orphaned (or deleted).')) return;

        // Logic to handle projects under deleted EPS? 
        // For simplicity, let's keep them but unset epsId, or warn user.
        // Currently just deleting the structure.
        this.epsService.deleteEPSNode(nodeId);
    }



    closeCreateModal() {
        this.showCreateModal = false;
    }

    createProject() {
        if (!this.newProjectData.name.trim()) return;

        const newId = Date.now();
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        // 1. Create Metadata
        const newProjectMeta = {
            id: newId,
            name: this.newProjectData.name,
            description: this.newProjectData.description,
            activityCount: 0,
            startDate: startDate,
            endDate: endDate,
            epsId: this.newProjectData.epsId // Link to EPS
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

        // 3. Save State
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(`project_${newId}`, JSON.stringify(initialState));
        }

        // 4. Update List
        this.projects.update(list => [...list, newProjectMeta]);
        this.saveProjectsList();

        this.closeCreateModal();
    }

    // --- EDIT PROJECT ---
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

        this.projects.update(list => list.map(p =>
            p.id === pid ? { ...p, name: this.editingProject.name, description: this.editingProject.description } : p
        ));
        this.saveProjectsList();

        if (isPlatformBrowser(this.platformId)) {
            const key = `project_${pid}`;
            const existing = localStorage.getItem(key);
            if (existing) {
                const state = JSON.parse(existing);
                state.projectName = this.editingProject.name;
                state.projectDescription = this.editingProject.description;
                localStorage.setItem(key, JSON.stringify(state));
            }
        }
        this.closeEditModal();
    }

    // --- DELETE PROJECT ---
    deleteProject(projectId: number, event: Event) {
        event.stopPropagation();
        if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) return;

        this.projects.update(list => list.filter(p => p.id !== projectId));
        this.saveProjectsList();

        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem(`project_${projectId}`);
        }
    }

    // --- OPEN PROJECT ---
    openProject(projectId: number) {
        if (isPlatformBrowser(this.platformId)) {
            const key = `project_${projectId}`;
            const savedState = localStorage.getItem(key);

            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    this.planningService.loadProjectState(state);
                } catch (e) {
                    console.error("Failed to load project state", e);
                    alert("Error loading project data.");
                    return;
                }
            } else {
                if (projectId !== 1) { // Allow demo failover if needed, but safer to warn
                    alert("Project data not found!");
                    return;
                }
            }
        }
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

                // Default to first EPS if available
                const defaultEPS = this.flattenedEPS().length > 0 ? this.flattenedEPS()[0].id : '';

                const newProject = {
                    id: newId,
                    name: (projectState as any).projectName || file.name.replace('.xer', ''),
                    description: (projectState as any).projectDescription || 'Imported from Primavera P6',
                    activityCount: projectState.activities.length,
                    startDate: projectState.projectStartDate,
                    endDate: projectState.projectEndDate,
                    epsId: defaultEPS // Default assignment
                };

                if (isPlatformBrowser(this.platformId)) {
                    (projectState as any).projectId = newId;
                    localStorage.setItem(`project_${newId}`, JSON.stringify(projectState));
                }

                this.projects.update(projects => [...projects, newProject]);
                this.saveProjectsList();
                this.planningService.loadProjectState(projectState);
                this.router.navigate(['/planning']);
            } else {
                alert('Failed to parse XER file.');
            }
        };
        reader.readAsText(file);
    }

    triggerFileInput() {
        const fileInput = document.getElementById('xerFileInput') as HTMLInputElement;
        fileInput?.click();
    }

    // --- DRAG AND DROP ---
    onDragStart(event: DragEvent, project: any) {
        if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', project.id.toString());
            event.dataTransfer.effectAllowed = 'move';
        }
    }

    onDragOver(event: DragEvent) {
        event.preventDefault(); // Allow dropping
        event.dataTransfer!.dropEffect = 'move';
    }

    onDragEnter(event: DragEvent) {
        event.preventDefault();
        const target = event.currentTarget as HTMLElement;
        target.classList.add('drag-over');
    }

    onDragLeave(event: DragEvent) {
        const target = event.currentTarget as HTMLElement;
        target.classList.remove('drag-over');
    }

    onDrop(event: DragEvent, targetEpsId: string) {
        event.preventDefault();
        const target = event.currentTarget as HTMLElement;
        target.classList.remove('drag-over');

        const projectId = Number(event.dataTransfer?.getData('text/plain'));
        if (projectId) {
            this.projects.update(list => list.map(p =>
                p.id === projectId ? { ...p, epsId: targetEpsId } : p
            ));
            this.saveProjectsList();

            // Also update persistent state if needed (epsId is mainly metadata)
            if (isPlatformBrowser(this.platformId)) {
                const key = `project_${projectId}`;
                const saved = localStorage.getItem(key);
                if (saved) {
                    const state = JSON.parse(saved);
                    // If we stored epsId in the project state blob, we'd update it here.
                    // Assuming epsId is only in the metadata list for now.
                }
            }
        }
    }
}
