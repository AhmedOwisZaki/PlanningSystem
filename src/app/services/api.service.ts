import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    private executeGraphQL(query: string, variables?: any): Observable<any> {
        // Use the endpoint without the /api suffix if necessary. 
        // environment.apiUrl is likely https://localhost:7132/api
        const graphqlUrl = this.apiUrl.replace('/api', '/graphql');

        let headers = new HttpHeaders();
        const token = this.authService.getToken();
        if (token) {
            console.log(`Sending GraphQL request to ${graphqlUrl} with Auth token`);
            headers = headers.set('Authorization', `Bearer ${token}`);
        } else {
            console.warn(`Sending GraphQL request to ${graphqlUrl} WITHOUT token`);
        }

        return this.http.post<any>(graphqlUrl, { query, variables }, { headers })
            .pipe(
                tap(res => {
                    if (res.errors && res.errors.length > 0) {
                        const errorMsg = res.errors[0].message;
                        console.error('GraphQL errors:', res.errors);
                        throw new Error(errorMsg);
                    }
                }),
                catchError(this.handleError)
            );
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'An error occurred';

        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Error: ${error.error.message}`;
        } else {
            // Server-side error
            // Try to extract specific message from backend response
            const serverMessage = typeof error.error === 'string'
                ? error.error
                : (error.error?.Message || JSON.stringify(error.error));

            errorMessage = serverMessage || `Error Code: ${error.status}\nMessage: ${error.message}`;
        }

        console.error('Full Error Object:', error);
        console.error(errorMessage);
        return throwError(() => new Error(errorMessage));
    }

    // ==================== AUTH ====================

    login(credentials: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/Account/login`, credentials)
            .pipe(
                tap(data => console.log('Login successful:', data)),
                catchError(this.handleError)
            );
    }

    register(userData: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/Account/register`, userData)
            .pipe(
                tap(data => console.log('Registration successful:', data)),
                catchError(this.handleError)
            );
    }

    // ==================== PROJECTS ====================

    getProjects(): Observable<any[]> {
        const query = `
            query {
                projects {
                    id
                    name
                    description
                    startDate
                    endDate
                    defaultCalendarId
                    activities {
                        id
                    }
                }
                epsNodes {
                    id
                    projectId
                    parentId
                }
            }
        `;
        return this.executeGraphQL(query).pipe(
            map(res => {
                const projects = res?.data?.projects || [];
                const epsNodes = res?.data?.epsNodes || [];
                return projects.map((p: any) => {
                    const node = epsNodes.find((n: any) => n.projectId === p.id);
                    return {
                        ...p,
                        epsId: node?.parentId,
                        activityCount: p.activities?.length || 0
                    };
                });
            }),
            tap(data => console.log('Fetched projects via GraphQL:', data))
        );
    }

    getProject(id: number): Observable<any> {
        const query = `
            query($id: Long!) {
                projects(where: { id: { eq: $id } }) {
                    id
                    name
                    description
                    startDate
                    endDate
                    defaultCalendarId
                }
                epsNodes(where: { projectId: { eq: $id } }) {
                    id
                    parentId
                }
            }
        `;
        return this.executeGraphQL(query, { id }).pipe(
            map(res => {
                const project = res?.data?.projects?.[0];
                const node = res?.data?.epsNodes?.[0];
                return project ? { ...project, epsId: node?.parentId } : null;
            }),
            tap(data => console.log('Fetched project via GraphQL:', data))
        );
    }

    getFullProject(projectId: number): Observable<any> {
        const query = `
            query($projectId: Long!) {
                projects(where: { id: { eq: $projectId } }) {
                    id
                    name
                    description
                    startDate
                    endDate
                    defaultCalendarId
                }
                activities(where: { projectId: { eq: $projectId } }) {
                    id
                    name
                    activityCode
                    startDate
                    duration
                    percentComplete
                    parentId
                    calendarId
                    type
                    resourceItems {
                        id
                        resourceId
                        amount
                    }
                }
                dependencies(where: { projectId: { eq: $projectId } }) {
                    id
                    sourceId
                    targetId
                    type
                    lag
                }
                resources {
                    id
                    name
                    unit
                    costPerUnit
                    resourceTypeId
                }
                calendars {
                    id
                    name
                    isDefault
                    workHoursPerDay
                    description
                    holidays {
                        date
                    }
                    workDays {
                        dayOfWeek
                        isWorkDay
                    }
                }
            }
        `;
        return this.executeGraphQL(query, { projectId }).pipe(
            map(res => res.data),
            tap(data => console.log('Fetched full project via GraphQL:', data))
        );
    }

    createProject(project: any): Observable<any> {
        const query = `
            mutation($input: CreateProjectInput!) {
                addProject(input: $input) {
                    id
                    name
                    description
                    startDate
                    endDate
                }
            }
        `;
        const input = {
            name: project.name,
            description: project.description,
            startDate: project.startDate,
            endDate: project.endDate,
            defaultCalendarId: project.defaultCalendarId,
            epsId: project.epsId
        };
        return this.executeGraphQL(query, { input }).pipe(
            map(res => {
                const p = res.data.addProject;
                return { ...p, epsId: project.epsId };
            }),
            tap(data => console.log('Created project via GraphQL:', data))
        );
    }

    updateProject(id: number, project: any): Observable<any> {
        const query = `
            mutation($input: UpdateProjectInput!) {
                updateProject(input: $input) {
                    id
                    name
                    description
                    startDate
                    endDate
                }
            }
        `;
        const input = {
            id: id,
            name: project.name,
            description: project.description,
            startDate: project.startDate,
            endDate: project.endDate,
            defaultCalendarId: project.defaultCalendarId
        };
        return this.executeGraphQL(query, { input }).pipe(
            map(res => res.data.updateProject),
            tap(data => console.log('Updated project via GraphQL:', data))
        );
    }

    deleteProject(id: number): Observable<any> {
        const query = `
            mutation($id: Long!) {
                deleteProject(id: $id)
            }
        `;
        return this.executeGraphQL(query, { id }).pipe(
            map(res => res.data.deleteProject),
            tap(() => console.log('Deleted project via GraphQL:', id))
        );
    }

    importXER(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<any>(`${this.apiUrl}/projects/import`, formData)
            .pipe(
                tap(data => console.log('Imported XER:', data)),
                catchError(this.handleError)
            );
    }

    exportXER(projectId: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/projects/${projectId}/export`, {
            responseType: 'blob'
        }).pipe(
            tap(() => console.log('Exported XER for project:', projectId)),
            catchError(this.handleError)
        );
    }

    setBaseline(projectId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/projects/${projectId}/baseline`, {})
            .pipe(
                tap(data => console.log('Set baseline:', data)),
                catchError(this.handleError)
            );
    }

    levelResources(projectId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/projects/${projectId}/level-resources`, {})
            .pipe(
                tap(data => console.log('Leveled resources:', data)),
                catchError(this.handleError)
            );
    }

    updateProjectEPS(projectId: number, epsId: string): Observable<any> {
        const query = `
            mutation($projectId: Long!, $targetEpsId: String) {
                moveProject(projectId: $projectId, targetEpsId: $targetEpsId) {
                    id
                }
            }
        `;
        return this.executeGraphQL(query, {
            projectId,
            targetEpsId: (epsId === 'EPS-ROOT' || !epsId) ? null : epsId
        }).pipe(
            map(res => res.data.moveProject),
            tap(data => console.log('Moved project via GraphQL:', data))
        );
    }

    // ==================== EPS ====================

    getEPS(): Observable<any[]> {
        const query = `
            query {
                epsNodes(where: { projectId: { eq: null } }) {
                    id
                    name
                    parentId
                }
            }
        `;
        return this.executeGraphQL(query).pipe(
            map(res => res.data.epsNodes),
            tap(data => console.log('Fetched EPS via GraphQL:', data))
        );
    }

    createEPS(eps: any): Observable<any> {
        const query = `
            mutation($input: CreateEPSNodeInput!) {
                addEPSNode(input: $input) {
                    id
                    name
                    parentId
                }
            }
        `;
        // Only pass fields expected by CreateEPSNodeInput
        const input = {
            name: eps.name,
            parentId: (eps.parentId === 'EPS-ROOT' || !eps.parentId) ? null : eps.parentId
        };
        return this.executeGraphQL(query, { input }).pipe(
            map(res => res.data.addEPSNode),
            tap(data => console.log('Created EPS via GraphQL:', data))
        );
    }

    updateEPS(id: string, eps: any): Observable<any> {
        const query = `
            mutation($input: UpdateEPSNodeInput!) {
                updateEPSNode(input: $input) {
                    id
                    name
                    parentId
                }
            }
        `;
        // Only pass fields expected by UpdateEPSNodeInput
        const input = {
            id: id,
            name: eps.name,
            parentId: (eps.parentId === 'EPS-ROOT' || !eps.parentId) ? null : eps.parentId
        };
        return this.executeGraphQL(query, { input }).pipe(
            map(res => res.data.updateEPSNode),
            tap(data => console.log('Updated EPS via GraphQL:', data))
        );
    }

    deleteEPS(id: string): Observable<any> {
        const query = `
            mutation($id: String!) {
                deleteEPSNode(id: $id)
            }
        `;
        return this.executeGraphQL(query, { id }).pipe(
            map(res => res.data.deleteEPSNode),
            tap(() => console.log('Deleted EPS via GraphQL:', id))
        );
    }

    // ==================== RESOURCES ====================

    getResources(): Observable<any[]> {
        const query = `
            query {
                resources {
                    id
                    name
                    unit
                    costPerUnit
                    resourceTypeId
                }
            }
        `;
        return this.executeGraphQL(query).pipe(
            map(res => res.data.resources),
            tap(data => console.log('Fetched resources via GraphQL:', data))
        );
    }

    createResource(resource: any): Observable<any> {
        const mutation = `
            mutation($input: CreateResourceInput!) {
                addResource(input: $input) {
                    id
                    name
                    unit
                    costPerUnit
                    resourceTypeId
                }
            }
        `;
        const input = {
            name: resource.name,
            unit: resource.unit,
            costPerUnit: resource.costPerUnit,
            resourceTypeId: resource.resourceTypeId,
            projectId: resource.projectId
        };
        return this.executeGraphQL(mutation, { input }).pipe(
            map(res => res.data.addResource),
            tap(data => console.log('Created resource via GraphQL:', data))
        );
    }

    updateResource(id: number, resource: any): Observable<any> {
        const mutation = `
            mutation($input: UpdateResourceInput!) {
                updateResource(input: $input) {
                    id
                    name
                    unit
                    costPerUnit
                    resourceTypeId
                }
            }
        `;
        const input = {
            id,
            name: resource.name,
            unit: resource.unit,
            costPerUnit: resource.costPerUnit,
            resourceTypeId: resource.resourceTypeId
        };
        return this.executeGraphQL(mutation, { input }).pipe(
            map(res => res.data.updateResource),
            tap(data => console.log('Updated resource via GraphQL:', data))
        );
    }

    deleteResource(id: number): Observable<any> {
        const mutation = `
            mutation($id: Long!) {
                deleteResource(id: $id)
            }
        `;
        return this.executeGraphQL(mutation, { id }).pipe(
            map(res => res.data.deleteResource),
            tap(() => console.log('Deleted resource via GraphQL:', id))
        );
    }

    // ==================== CALENDARS ====================

    getCalendars(): Observable<any[]> {
        const query = `
            query {
                calendars {
                    id
                    name
                    isDefault
                    workHoursPerDay
                    description
                }
            }
        `;
        return this.executeGraphQL(query).pipe(
            map(res => res.data.calendars),
            tap(data => console.log('Fetched calendars via GraphQL:', data))
        );
    }

    createCalendar(calendar: any): Observable<any> {
        const mutation = `
            mutation($input: CreateCalendarInput!) {
                addCalendar(input: $input) {
                    id
                    name
                    isDefault
                    workHoursPerDay
                    description
                }
            }
        `;
        const input = {
            name: calendar.name,
            isDefault: calendar.isDefault,
            workHoursPerDay: calendar.workHoursPerDay,
            description: calendar.description,
            projectId: calendar.projectId
        };
        return this.executeGraphQL(mutation, { input }).pipe(
            map(res => res.data.addCalendar),
            tap(data => console.log('Created calendar via GraphQL:', data))
        );
    }

    updateCalendar(id: number, calendar: any): Observable<any> {
        const mutation = `
            mutation($input: UpdateCalendarInput!) {
                updateCalendar(input: $input) {
                    id
                    name
                    isDefault
                    workHoursPerDay
                    description
                }
            }
        `;
        const input = {
            id,
            name: calendar.name,
            isDefault: calendar.isDefault,
            workHoursPerDay: calendar.workHoursPerDay,
            description: calendar.description
        };
        return this.executeGraphQL(mutation, { input }).pipe(
            map(res => res.data.updateCalendar),
            tap(data => console.log('Updated calendar via GraphQL:', data))
        );
    }

    deleteCalendar(id: number): Observable<any> {
        const mutation = `
            mutation($id: Long!) {
                deleteCalendar(id: $id)
            }
        `;
        return this.executeGraphQL(mutation, { id }).pipe(
            map(res => res.data.deleteCalendar),
            tap(() => console.log('Deleted calendar via GraphQL:', id))
        );
    }

    // ==================== ACTIVITIES ====================

    getActivities(projectId: number): Observable<any[]> {
        const query = `
            query($projectId: Long!) {
                activities(where: { projectId: { eq: $projectId } }) {
                    id
                    name
                    activityCode
                    startDate
                    duration
                    percentComplete
                    parentId
                    calendarId
                    type
                }
            }
        `;
        return this.executeGraphQL(query, { projectId }).pipe(
            map(res => res.data.activities),
            tap(data => console.log('Fetched activities via GraphQL:', data))
        );
    }

    createActivity(activity: any): Observable<any> {
        const mutation = `
            mutation($input: CreateActivityInput!) {
                addActivity(input: $input) {
                    id
                    name
                    activityCode
                    startDate
                    duration
                    percentComplete
                    parentId
                    calendarId
                    type
                }
            }
        `;
        const input = {
            activityCode: activity.activityCode || '',
            name: activity.name,
            startDate: activity.startDate,
            duration: activity.duration,
            projectId: activity.projectId,
            calendarId: activity.calendarId,
            type: activity.type || 'Task'
        };
        return this.executeGraphQL(mutation, { input }).pipe(
            map(res => res.data.addActivity),
            tap(data => console.log('Created activity via GraphQL:', data))
        );
    }

    updateActivity(id: number, activity: any): Observable<any> {
        const mutation = `
            mutation($input: UpdateActivityInput!) {
                updateActivity(input: $input) {
                    id
                    name
                    activityCode
                    startDate
                    duration
                    percentComplete
                    parentId
                    calendarId
                    type
                }
            }
        `;
        const input = {
            id,
            activityCode: activity.activityCode || '',
            name: activity.name,
            startDate: activity.startDate,
            duration: activity.duration,
            calendarId: activity.calendarId,
            type: activity.type || 'Task',
            percentComplete: activity.percentComplete || 0
        };
        return this.executeGraphQL(mutation, { input }).pipe(
            map(res => res.data.updateActivity),
            tap(data => console.log('Updated activity via GraphQL:', data))
        );
    }

    deleteActivity(id: number): Observable<any> {
        const mutation = `
            mutation($id: Long!) {
                deleteActivity(id: $id)
            }
        `;
        return this.executeGraphQL(mutation, { id }).pipe(
            map(res => res.data.deleteActivity),
            tap(() => console.log('Deleted activity via GraphQL:', id))
        );
    }

    // ==================== DEPENDENCIES ====================

    getDependencies(projectId: number): Observable<any[]> {
        const query = `
            query($projectId: Long!) {
                dependencies(where: { projectId: { eq: $projectId } }) {
                    id
                    sourceId
                    targetId
                    type
                    lag
                }
            }
        `;
        return this.executeGraphQL(query, { projectId }).pipe(
            map(res => res.data.dependencies),
            tap(data => console.log('Fetched dependencies via GraphQL:', data))
        );
    }

    createDependency(dependency: any): Observable<any> {
        const mutation = `
            mutation($input: CreateDependencyInput!) {
                addDependency(input: $input) {
                    id
                    sourceId
                    targetId
                    type
                    lag
                }
            }
        `;
        const input = {
            sourceId: dependency.sourceId,
            targetId: dependency.targetId,
            type: dependency.type || 'FS',
            lag: dependency.lag || 0,
            projectId: dependency.projectId
        };
        return this.executeGraphQL(mutation, { input }).pipe(
            map(res => res.data.addDependency),
            tap(data => console.log('Created dependency via GraphQL:', data))
        );
    }

    updateDependency(id: number, dependency: any): Observable<any> {
        const mutation = `
            mutation($input: UpdateDependencyInput!) {
                updateDependency(input: $input) {
                    id
                    sourceId
                    targetId
                    type
                    lag
                }
            }
        `;
        const input = {
            id,
            type: dependency.type || 'FS',
            lag: dependency.lag || 0
        };
        return this.executeGraphQL(mutation, { input }).pipe(
            map(res => res.data.updateDependency),
            tap(data => console.log('Updated dependency via GraphQL:', data))
        );
    }

    deleteDependency(id: number): Observable<any> {
        const mutation = `
            mutation($id: Long!) {
                deleteDependency(id: $id)
            }
        `;
        return this.executeGraphQL(mutation, { id }).pipe(
            map(res => res.data.deleteDependency),
            tap(() => console.log('Deleted dependency via GraphQL:', id))
        );
    }

    // ==================== ACTIVITY CODES ====================

    getActivityCodes(): Observable<any[]> {
        console.warn('ActivityCodes are not supported in the backend yet. Returning empty array.');
        return of([]);
    }

    createActivityCode(code: any): Observable<any> {
        console.warn('ActivityCodes are not supported in the backend yet.');
        return of(null);
    }

    deleteActivityCode(id: number): Observable<any> {
        console.warn('ActivityCodes are not supported in the backend yet.');
        return of(null);
    }

    createActivityCodeValue(codeId: number, value: any): Observable<any> {
        console.warn('ActivityCodes are not supported in the backend yet.');
        return of(null);
    }

    deleteActivityCodeValue(codeId: number, valueId: number): Observable<any> {
        console.warn('ActivityCodes are not supported in the backend yet.');
        return of(null);
    }

    // ==================== RESOURCE ASSIGNMENTS ====================

    assignResourceToActivity(activityId: number, assignment: any): Observable<any> {
        const mutation = `
            mutation($input: CreateResourceItemInput!) {
                addResourceItem(input: $input) {
                    id
                    activityId
                    resourceId
                    amount
                }
            }
        `;
        const input = {
            activityId: assignment.activityId,
            resourceId: assignment.resourceId,
            amount: assignment.amount
        };
        return this.executeGraphQL(mutation, { input }).pipe(
            map(res => res.data.addResourceItem),
            tap(data => console.log('Assigned resource via GraphQL:', data))
        );
    }

    updateResourceAssignment(activityId: number, resourceId: number, assignment: any): Observable<any> {
        // Note: Backend requires ResourceItem ID. If we don't have it, we might need to find it.
        // For now, assuming assignment object has 'id'.
        const mutation = `
            mutation($input: UpdateResourceItemInput!) {
                updateResourceItem(input: $input) {
                    id
                    activityId
                    resourceId
                    amount
                }
            }
        `;
        const input = {
            id: assignment.id,
            amount: assignment.amount
        };
        return this.executeGraphQL(mutation, { input }).pipe(
            map(res => res.data.updateResourceItem),
            tap(data => console.log('Updated resource assignment via GraphQL:', data))
        );
    }

    removeResourceFromActivity(activityId: number, resourceId: number, resourceItemId?: number): Observable<any> {
        const mutation = `
            mutation($id: Long!) {
                deleteResourceItem(id: $id)
            }
        `;
        return this.executeGraphQL(mutation, { id: resourceItemId }).pipe(
            map(res => res.data.deleteResourceItem),
            tap(() => console.log('Removed resource from activity via GraphQL'))
        );
    }

    // ==================== ACTIVITY STEPS ====================

    createActivityStep(activityId: number, step: any): Observable<any> {
        console.warn('ActivitySteps are not supported in the backend yet.');
        return of(null);
    }

    updateActivityStep(activityId: number, stepId: number, step: any): Observable<any> {
        console.warn('ActivitySteps are not supported in the backend yet.');
        return of(null);
    }

    deleteActivityStep(activityId: number, stepId: number): Observable<any> {
        console.warn('ActivitySteps are not supported in the backend yet.');
        return of(null);
    }

    // ==================== ACTIVITY CODE ASSIGNMENTS ====================

    updateActivityCodes(activityId: number, codes: any): Observable<any> {
        console.warn('ActivityCode assignments are not supported in the backend yet.');
        return of(null);
    }
}
