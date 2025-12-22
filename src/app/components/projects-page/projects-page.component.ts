import { Component, signal, PLATFORM_ID, inject, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlanningService } from '../../services/planning.service';
import { XerParserService } from '../../services/xer-parser.service';
import { EPSService } from '../../services/eps.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
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
    searchTerm = signal('');

    // Computed signal for filtered projects
    filteredProjects = computed(() => {
        const term = this.searchTerm().toLowerCase().trim();
        if (!term) return this.projects();
        return this.projects().filter(p =>
            (p.name && p.name.toLowerCase().includes(term)) ||
            (p.description && p.description.toLowerCase().includes(term))
        );
    });

    // Helper to determine if an EPS node or its children have visible projects during search
    hasVisibleContent(node: EPSNode): boolean {
        const term = this.searchTerm().toLowerCase().trim();
        if (!term) return true;

        // If node itself matches (optional, but good for UX)
        if (node.name.toLowerCase().includes(term)) return true;

        // If any associated project matches
        const hasMatchingProjects = this.getProjectsForEPS(node.id).length > 0;
        if (hasMatchingProjects) return true;

        // If any child has visible content
        if (node.children && node.children.length > 0) {
            return node.children.some(child => this.hasVisibleContent(child));
        }

        return false;
    }

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
        if (!this.selectedEPSId) return;

        const today = new Date().toISOString().split('T')[0];
        this.newProjectData = {
            name: 'New Project',
            description: '',
            startDate: today,
            epsId: this.selectedEPSId,
            isConstruction: false
        };
        this.showCreateModal = true;
    }

    // EPS Management Modal
    showEPSModal = false;
    newEPSName = '';
    selectedParentEPSId: string | null = null; // For adding child EPS

    // Project Form Data
    editingProject: any = { name: '', description: '', isConstruction: false };
    newProjectData: any = { name: '', description: '', epsId: '', isConstruction: false };
    selectedProjectForAction: number | null = null;

    constructor(
        private router: Router,
        private planningService: PlanningService,
        private xerParser: XerParserService,
        private epsService: EPSService,
        private apiService: ApiService,
        private authService: AuthService
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
        // Load projects from backend API
        this.apiService.getProjects().subscribe({
            next: (projects) => {
                const loadedProjects = projects.map((p: any) => ({
                    ...p,
                    startDate: new Date(p.startDate),
                    endDate: new Date(p.endDate)
                }));
                this.projects.set(loadedProjects);
            },
            error: (error) => {
                console.error('Failed to load projects from API:', error);
                alert('Failed to load projects. Please check your connection to the backend.');
            }
        });
    }

    getProjectsForEPS(epsId: string) {
        return this.filteredProjects().filter(p => p.epsId === epsId);
    }

    getUnassignedProjects() {
        // Create a set of valid IDs from the flattened list (more efficient than re-traversing)
        const validEpsIds = new Set(this.flattenedEPS().map(node => node.id));
        return this.filteredProjects().filter(p => !p.epsId || !validEpsIds.has(p.epsId));
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

        const startDate = new Date(this.newProjectData.startDate || new Date());
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);

        const projectData = {
            name: this.newProjectData.name,
            description: this.newProjectData.description,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            epsId: this.newProjectData.epsId
        };

        this.apiService.createProject(projectData).subscribe({
            next: (createdProject) => {
                const newProjectMeta = {
                    ...createdProject,
                    startDate: new Date(createdProject.startDate),
                    endDate: new Date(createdProject.endDate)
                };
                this.projects.update(list => [...list, newProjectMeta]);
                this.closeCreateModal();
            },
            error: (error) => {
                console.error('Failed to create project:', error);
                alert('Failed to create project. Please try again.');
            }
        });
    }

    // --- EDIT PROJECT ---
    openEditModal(project: any, event: Event) {
        event.stopPropagation();
        this.selectedProjectForAction = project.id;

        // Format date for <input type="date"> (YYYY-MM-DD)
        let formattedDate = '';
        if (project.startDate) {
            const d = new Date(project.startDate);
            formattedDate = d.toISOString().split('T')[0];
        }

        this.editingProject = {
            name: project.name,
            description: project.description,
            startDate: formattedDate,
            isConstruction: !!project.isConstruction
        };
        this.showEditModal = true;
    }

    closeEditModal() {
        this.showEditModal = false;
        this.selectedProjectForAction = null;
    }

    updateProject() {
        if (!this.selectedProjectForAction || !this.editingProject.name.trim()) return;
        const pid = this.selectedProjectForAction;

        const updateData = {
            name: this.editingProject.name,
            description: this.editingProject.description,
            startDate: new Date(this.editingProject.startDate).toISOString(),
            isConstruction: this.editingProject.isConstruction,
            // Ensure we calculate/pass endDate as it's required by the UpdateProjectInput record
            endDate: new Date(new Date(this.editingProject.startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        this.apiService.updateProject(pid, updateData).subscribe({
            next: (updatedProject) => {
                this.projects.update(list => list.map(p =>
                    p.id === pid ? {
                        ...p,
                        name: updatedProject.name || updatedProject.Name,
                        description: updatedProject.description || updatedProject.Description,
                        startDate: new Date(updatedProject.startDate || updatedProject.StartDate),
                        endDate: new Date(updatedProject.endDate || updatedProject.EndDate)
                    } : p
                ));
                this.closeEditModal();
            },
            error: (error) => {
                console.error('Failed to update project:', error);
                alert('Failed to update project. Please try again.');
            }
        });
    }

    // --- DELETE PROJECT ---
    deleteProject(projectId: number, event: Event) {
        event.stopPropagation();
        if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) return;

        this.apiService.deleteProject(projectId).subscribe({
            next: () => {
                this.projects.update(list => list.filter(p => p.id !== projectId));
            },
            error: (error) => {
                console.error('Failed to delete project:', error);
                alert('Failed to delete project. Please try again.');
            }
        });
    }

    // --- OPEN PROJECT ---
    openProject(projectId: number) {
        this.planningService.loadFullProject(projectId).subscribe({
            next: () => {
                this.router.navigate(['/planning']);
            },
            error: (error) => {
                console.error('Failed to load project:', error);
                alert('Failed to load project data. Please try again.');
            }
        });
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (!content) return;

            const projectState = this.xerParser.parse(content);
            if (!projectState) {
                alert('Invalid or empty XER file.');
                return;
            }

            const dto = {
                name: projectState.projectName,
                description: projectState.projectDescription,
                startDate: projectState.projectStartDate,
                endDate: projectState.projectEndDate,
                activities: projectState.activities.map(a => ({
                    id: a.id,
                    activityCode: a.id.toString(), // P6 often uses ID as code
                    name: a.name,
                    startDate: a.startDate,
                    duration: a.duration,
                    percentComplete: a.percentComplete,
                    type: a.type,
                    parentId: a.parentId
                })),
                dependencies: projectState.dependencies.map(d => ({
                    sourceId: d.sourceId,
                    targetId: d.targetId,
                    type: d.type,
                    lag: d.lag
                })),
                resources: projectState.resources?.map(r => ({
                    id: r.id,
                    name: r.name,
                    unit: r.unit,
                    costPerUnit: r.costPerUnit,
                    resourceType: 'Labor'
                })) || [],
                resourceAssignments: projectState.activities.flatMap(a => a.resourceItems || []).map(ri => ({
                    activityId: ri.activityId,
                    resourceId: ri.resourceId,
                    amount: ri.amount
                }))
            };

            this.apiService.importParsedProject(dto).subscribe({
                next: (importedProject) => {
                    // Update list
                    const newProject = {
                        ...importedProject,
                        startDate: new Date(importedProject.startDate),
                        endDate: new Date(importedProject.endDate)
                    };
                    this.projects.update(projects => [...projects, newProject]);

                    // Open the project
                    this.openProject(importedProject.id);
                },
                error: (error) => {
                    console.error('Failed to import project:', error);
                    alert('Failed to import project. Please check the file format or connection.');
                }
            });
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
            this.apiService.updateProjectEPS(projectId, targetEpsId).subscribe({
                next: () => {
                    this.projects.update(list => list.map(p =>
                        p.id === projectId ? { ...p, epsId: targetEpsId } : p
                    ));
                },
                error: (error) => {
                    console.error('Failed to update project EPS:', error);
                    alert('Failed to move project. Please try again.');
                }
            });
        }
    }

    logout() {
        this.authService.logout();
    }
}
