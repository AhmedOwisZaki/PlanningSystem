import { Component, computed, inject, signal, HostListener, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningService } from '../../services/planning.service';
import { ActivityDetailsComponent } from '../activity-details/activity-details.component';
import { EditorComponent } from '../editor/editor.component';
import { ResourceUsageProfileComponent } from '../resource-usage-profile/resource-usage-profile.component';
import { EVMDashboardComponent } from '../evm-dashboard/evm-dashboard.component';
import { DependencyDetailsComponent } from '../dependency-details/dependency-details.component';
import { SCurvesChartComponent } from '../s-curves-chart/s-curves-chart.component';

export interface ColumnDef {
  id: string;
  name: string;
  width: WritableSignal<number>;
  visible: WritableSignal<boolean>;
  property: string;
}

@Component({
  selector: 'app-gantt',
  standalone: true,
  imports: [CommonModule, FormsModule, ActivityDetailsComponent, EditorComponent, ResourceUsageProfileComponent, EVMDashboardComponent, DependencyDetailsComponent, SCurvesChartComponent],
  templateUrl: './gantt.component.html',
  styleUrls: ['./gantt.component.scss']
})
export class GanttComponent {
  // ... (keep phaseColors up to handleZoom)
  private phaseColors = [
    'rgba(227, 242, 253, 0.5)', // Very Light Blue
    'rgba(232, 245, 233, 0.5)', // Very Light Green
    'rgba(255, 243, 224, 0.5)', // Very Light Orange
    'rgba(243, 229, 245, 0.5)', // Very Light Purple
    'rgba(252, 228, 236, 0.5)', // Very Light Pink
    'rgba(239, 235, 233, 0.5)', // Very Light Brown
    'rgba(255, 253, 231, 0.5)', // Very Light Yellow
    'rgba(224, 247, 250, 0.5)', // Very Light Cyan
    'rgba(232, 234, 246, 0.5)', // Light Indigo
    'rgba(241, 248, 233, 0.5)', // Light Lime
    'rgba(255, 248, 225, 0.5)', // Light Amber
    'rgba(236, 239, 241, 0.5)'  // Light Blue Grey
  ];

  /* Toolbar Methods */
  onAdd() {
    const selected = this.selectedActivity();
    let parentId: number | null = null;
    if (selected) {
      // If selecting a WBS, add as child. If selecting a Task, add as sibling.
      parentId = (selected.type === 'WBS') ? selected.id : (selected.parentId || null);
    }
    this.planningService.addActivity(parentId, 'New Activity', false);
  }

  onAddWBS() {
    const selected = this.selectedActivity();
    let parentId: number | null = null;
    if (selected) {
      // If selecting a WBS, add as child. If selecting a Task, add as sibling.
      parentId = (selected.type === 'WBS') ? selected.id : (selected.parentId || null);
    }
    this.planningService.addActivity(parentId, 'New WPS Node', true);
  }

  onDelete() {
    const activity = this.selectedActivity();
    if (activity) {
      if (confirm('Are you sure you want to delete this activity?')) {
        this.planningService.deleteActivity(activity.id);
        this.planningService.setSelectedActivity(null);
      }
    } else {
      alert('Please select an activity in the Gantt chart first, then click delete.');
    }
  }

  onSchedule() {
    this.planningService.scheduleProject();
  }

  onBaseline(event: MouseEvent) {
    if (event.shiftKey) {
      if (confirm('Are you sure you want to clear the baseline?')) {
        this.planningService.clearBaseline();
      }
    } else {
      const name = prompt('Enter a name for the new baseline:', `Baseline ${new Date().toLocaleDateString()}`);
      if (name) {
        this.planningService.createBaseline(name);
      }
    }
  }

  onLevel(event: MouseEvent) {
    this.planningService.levelResources();
  }


  getRowStyle(activity: any) {
    const backgroundColor = this.getPhaseColor(activity);
    return { 'background-color': backgroundColor };
  }

  getWbsClass(activity: any): string {
    if (this.isParentActivity(activity)) {
      const level = this.getActivityLevel(activity);
      if (level === 0 && activity.parentId == null) return 'wbs-root';
      switch (level) {
        case 1: return 'wbs-level-1';
        case 2: return 'wbs-level-2';
        case 3: return 'wbs-level-3';
        case 4: return 'wbs-level-4';
        case 5: return 'wbs-level-5';
        case 6: return 'wbs-level-6';
        default: return 'wbs-level-x';
      }
    }
    return '';
  }

  getPhaseColor(activity: any): string | null {
    if (this.selectedActivity()?.id == activity.id) return null;

    const allActivities = this.activities();

    // 1. If it's a WBS, use its own ID for the color
    if (this.isParentActivity(activity)) {
      const colorIndex = (Math.abs(Number(activity.id)) % this.phaseColors.length);
      return this.phaseColors[colorIndex];
    }

    // 2. If it's a task, find its closest WBS parent
    let current = activity;
    let depth = 0;
    while (current && current.parentId != null && depth < 20) {
      const parent = allActivities.find(a => a.id == current.parentId);
      if (!parent) break;
      if (this.isParentActivity(parent)) {
        const colorIndex = (Math.abs(Number(parent.id)) % this.phaseColors.length);
        return this.phaseColors[colorIndex];
      }
      current = parent;
      depth++;
    }

    return '#ffffff'; // Root level tasks or no WBS ancestor
  }

  handleZoom(delta: number) {
    const zoomDelta = delta > 0 ? -0.1 : 0.1;
    const currentZoom = this.zoomLevel();
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, currentZoom + zoomDelta));

    if (newZoom !== currentZoom) {
      this.zoomLevel.set(newZoom);
    }
  }
  public planningService = inject(PlanningService);
  private router = inject(Router);

  goBack() {
    this.router.navigate(['/projects']);
  }

  activities = this.planningService.activities;
  projectStartDate = this.planningService.projectStartDate;
  projectEndDate = this.planningService.projectEndDate;
  projectState = this.planningService.state;
  selectedActivity = this.planningService.selectedActivity;
  selectedDependency = this.planningService.selectedDependency;

  // Resizable Panel State
  taskListWidth = signal(600);
  isResizingPanel = false;

  // Dynamic Column Definitions
  columns = signal<ColumnDef[]>([
    { id: 'id', name: 'Activity ID', width: signal(60), visible: signal(true), property: 'id' },
    { id: 'status', name: 'Status', width: signal(30), visible: signal(true), property: 'status' },
    { id: 'name', name: 'Activity Name', width: signal(200), visible: signal(true), property: 'name' },
    { id: 'dur', name: 'Original Duration', width: signal(40), visible: signal(true), property: 'duration' },
    { id: 'start', name: 'Start', width: signal(80), visible: signal(true), property: 'startDate' },
    { id: 'finish', name: 'Finish', width: signal(80), visible: signal(true), property: 'finish' }, // computed
    { id: 'float', name: 'Total Float', width: signal(50), visible: signal(true), property: 'totalFloat' },

    // New Columns (Hidden by default or added)
    { id: 'percent', name: '% Complete', width: signal(50), visible: signal(false), property: 'percentComplete' },
    { id: 'earlyStart', name: 'Early Start', width: signal(80), visible: signal(false), property: 'earlyStart' },
    { id: 'earlyFinish', name: 'Early Finish', width: signal(80), visible: signal(false), property: 'earlyFinish' },
    { id: 'lateStart', name: 'Late Start', width: signal(80), visible: signal(false), property: 'lateStart' },
    { id: 'lateFinish', name: 'Late Finish', width: signal(80), visible: signal(false), property: 'lateFinish' },
    { id: 'blStart', name: 'BL Start', width: signal(80), visible: signal(false), property: 'baselineStartDate' },
    { id: 'blFinish', name: 'BL Finish', width: signal(80), visible: signal(false), property: 'baselineEndDate' },
    { id: 'actualStart', name: 'Actual Start', width: signal(80), visible: signal(false), property: 'actualStart' },
    { id: 'actualFinish', name: 'Actual Finish', width: signal(80), visible: signal(false), property: 'actualFinish' },
    { id: 'budget', name: 'Budget (BAC)', width: signal(80), visible: signal(false), property: 'budgetAtCompletion' },
    { id: 'actualCost', name: 'Actual Cost (AC)', width: signal(80), visible: signal(false), property: 'actualCost' }
  ]);

  visibleColumns = computed(() => this.columns().filter(c => c.visible()));

  isResizingColumn = false;
  resizingColumnId: string | null = null;
  columnDragStartX = 0;
  columnDragStartWidth = 0;

  isColumnDropdownOpen = false;

  toggleColumnDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isColumnDropdownOpen = !this.isColumnDropdownOpen;
    // Close other dropdowns
    if (this.isColumnDropdownOpen) this.isToolbarOpen = false;
  }

  toggleColumn(colId: string) {
    const col = this.columns().find(c => c.id === colId);
    if (col) {
      col.visible.set(!col.visible());
    }
  }

  // View settings
  dayWidth = 40; // pixels per day
  headerHeight = 60;
  rowHeight = 30; // With box-sizing: border-box, this includes the 1px border
  zoomLevel = signal(1);
  minZoom = 0.1;
  maxZoom = 6;

  // Bottom Panel Tab State
  activeBottomTab = signal<'details' | 'usage'>('details');
  isActivityDetailsVisible = signal(false);
  isDependencyDetailsVisible = signal(false);
  // Scroll Sync State
  timelineScrollX = signal(0);

  isBaselineApplied = computed(() => {
    const state = this.projectState();
    return (state.baselines || []).some(b => b.isPrimary);
  });

  // Computed timeline start date with 2-day buffer
  ganttStartDate = computed(() => {
    const projectStart = new Date(this.planningService.projectStartDate()).getTime();
    const activities = this.activities();
    let minDate = projectStart;

    activities.forEach(a => {
      if (a.startDate) {
        const s = new Date(a.startDate).getTime();
        if (s < minDate) minDate = s;
      }
      if (a.earlyStart) {
        const es = new Date(a.earlyStart).getTime();
        if (es < minDate) minDate = es;
      }
    });

    const start = new Date(minDate);
    start.setDate(start.getDate() - 2);
    start.setHours(0, 0, 0, 0); // Normalize to midnight
    return start;
  });

  // Computed timeline
  totalDays = computed(() => {
    const start = this.ganttStartDate();
    const end = this.planningService.projectEndDate();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    // Add a generous buffer (2 years) so zooming out doesn't reveal white space on the right
    const projectDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return projectDays + 730;
  });

  timelineWidth = computed(() => this.totalDays() * this.dayWidth * this.zoomLevel());

  days = computed(() => {
    const daysArr = [];
    const start = new Date(this.ganttStartDate());
    for (let i = 0; i < this.totalDays(); i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      daysArr.push(d);
    }
    return daysArr;
  });

  // Computed months for header
  months = computed(() => {
    const monthsArr: { date: Date; dayCount: number }[] = [];
    const days = this.days();

    let currentMonth = -1;
    let currentYear = -1;
    let dayCount = 0;

    days.forEach((day, index) => {
      const month = day.getMonth();
      const year = day.getFullYear();

      if (month !== currentMonth || year !== currentYear) {
        if (currentMonth !== -1) {
          monthsArr.push({ date: days[index - dayCount], dayCount });
        }
        currentMonth = month;
        currentYear = year;
        dayCount = 1;
      } else {
        dayCount++;
      }
    });

    // Push the last month
    if (dayCount > 0) {
      monthsArr.push({ date: days[days.length - dayCount], dayCount });
    }

    return monthsArr;
  });

  // Helper to position tasks
  getTaskLeft(activity: any): number {
    const start = new Date(this.ganttStartDate());
    start.setHours(0, 0, 0, 0); // Normalize to midnight
    const actStart = activity.earlyStart ? new Date(activity.earlyStart) : new Date(activity.startDate);
    const diffTime = actStart.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays * this.dayWidth * this.zoomLevel();
  }

  getTaskWidth(activity: any): number {
    const start = activity.earlyStart ? new Date(activity.earlyStart) : new Date(activity.startDate);
    const end = activity.earlyFinish ? new Date(activity.earlyFinish) : (activity.endDate ? new Date(activity.endDate) : null);

    if (start && end) {
      const diffTime = end.getTime() - start.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return days * this.dayWidth * this.zoomLevel();
    }

    return (activity.duration || 1) * this.dayWidth * this.zoomLevel();
  }

  getBaselineLeft(date: Date): number {
    if (!date) return 0;
    const start = new Date(this.ganttStartDate());
    start.setHours(0, 0, 0, 0);
    const blStart = new Date(date);
    blStart.setHours(0, 0, 0, 0);
    const diffTime = blStart.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays * this.dayWidth * this.zoomLevel();
  }

  getBaselineWidth(start: Date, end: Date): number {
    if (!start || !end) return 0;
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);

    // Total days inclusive of start/end boundaries
    const diffTime = e.getTime() - s.getTime();
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return (days || 1) * this.dayWidth * this.zoomLevel();
  }

  // Computed visible activities (respecting expand/collapse)
  visibleActivities = computed(() => {
    const allActivities = this.activities();
    const visible: any[] = [];

    const addVisibleActivities = (parentId: number | null | undefined) => {
      // Use == to handle null/undefined and string/number mismatches
      const children = allActivities.filter(a => (a.parentId || null) == (parentId || null));
      children.forEach(activity => {
        visible.push(activity);
        if (activity.isExpanded !== false && this.planningService.isParent(activity.id)) {
          addVisibleActivities(activity.id);
        }
      });
    };

    addVisibleActivities(null);
    return visible;
  });

  getActivityLevel(activity: any): number {
    return this.planningService.getLevel(activity.id);
  }

  isParentActivity(activity: any): boolean {
    if (activity.type === 'WBS') return true;
    return this.planningService.isParent(activity.id);
  }

  getDisplayFinish(activity: any): Date | null {
    const rawFinish = activity.lateFinish || activity.earlyFinish || activity.endDate;
    if (!rawFinish) return null;
    const d = new Date(rawFinish);
    d.setDate(d.getDate() - 1);
    return d;
  }

  toggleActivity(activity: any, event: MouseEvent) {
    event.stopPropagation();
    this.planningService.toggleExpand(activity.id);
  }

  // Computed dependency lines
  // Computed dependency lines
  dependencyLines = computed(() => {
    const lines = [];
    const activities = this.visibleActivities();
    const dependencies = this.planningService.dependencies();

    // Color mapping by type
    const colorMap = {
      'FS': '#fc00fcff', // Black
      'FF': '#01daf7ff', // Green
      'SS': '#ff6b6b', // Red
      'SF': '#fcc419'  // Yellow
    };

    // Track usage of ports to separate lines (SourceId-Type -> count)
    const portUsage = new Map<string, number>();

    const getOffset = (count: number): number => {
      if (count === 0) return 0;
      // Alternating offsets: 0, 10, -10, 20, -20...
      return Math.ceil(count / 2) * 5 * (count % 2 === 0 ? -1 : 1);
    };

    for (const dep of dependencies) {
      const source = activities.find(a => a.id === dep.sourceId);
      const target = activities.find(a => a.id === dep.targetId);
      if (source && target) {
        const sourceIdx = activities.indexOf(source);
        const targetIdx = activities.indexOf(target);

        let x1, x2;
        // Central y-positions (before offset)
        let y1 = (sourceIdx * this.rowHeight) + (this.rowHeight / 2);
        let y2 = (targetIdx * this.rowHeight) + (this.rowHeight / 2);

        // Determine port types
        // FS: Source=Finish, Target=Start
        const srcType = (dep.type === 'FS' || dep.type === 'FF') ? 'finish' : 'start';
        const tgtType = (dep.type === 'FS' || dep.type === 'SS') ? 'start' : 'finish';

        // Calculate Source Offset
        const srcKey = `${dep.sourceId}-${srcType}`;
        const srcCount = portUsage.get(srcKey) || 0;
        portUsage.set(srcKey, srcCount + 1);
        y1 += getOffset(srcCount);

        // Calculate Target Offset
        const tgtKey = `${dep.targetId}-${tgtType}`;
        const tgtCount = portUsage.get(tgtKey) || 0;
        portUsage.set(tgtKey, tgtCount + 1);
        y2 += getOffset(tgtCount);

        // Source Point X
        if (srcType === 'finish') {
          x1 = this.getTaskLeft(source) + this.getTaskWidth(source);
        } else {
          x1 = this.getTaskLeft(source);
        }

        // Target Point X (with Arrow Gap)
        const arrowLen = 12;
        if (tgtType === 'start') {
          x2 = this.getTaskLeft(target) - arrowLen;
        } else {
          x2 = this.getTaskLeft(target) + this.getTaskWidth(target) + arrowLen;
        }

        // Calculate offset for path routing
        const offset = 10;
        let p = '';

        // Routing Logic (using offset coordinates)
        if (dep.type === 'FS') {
          if (x1 < x2) {
            p = `M ${x1} ${y1} L ${x2 - offset} ${y1} L ${x2 - offset} ${y2} L ${x2} ${y2}`;
          } else {
            p = `M ${x1} ${y1} L ${x1 + offset} ${y1} L ${x1 + offset} ${y2 - (y2 - y1) / 2} L ${x2 - offset} ${y2 - (y2 - y1) / 2} L ${x2 - offset} ${y2} L ${x2} ${y2}`;
          }
        } else if (dep.type === 'FF') {
          const safeX = Math.max(x1, x2) + offset;
          p = `M ${x1} ${y1} L ${safeX} ${y1} L ${safeX} ${y2} L ${x2} ${y2}`;
        } else if (dep.type === 'SS') {
          const safeX = Math.min(x1, x2) - offset;
          p = `M ${x1} ${y1} L ${safeX} ${y1} L ${safeX} ${y2} L ${x2} ${y2}`;
        } else if (dep.type === 'SF') {
          const safeX1 = x1 - offset;
          const safeX2 = x2 + offset;
          const midY = y1 + (y2 - y1) / 2;
          p = `M ${x1} ${y1} L ${safeX1} ${y1} L ${safeX1} ${midY} L ${safeX2} ${midY} L ${safeX2} ${y2} L ${x2} ${y2}`;
        }

        lines.push({
          path: p,
          id: dep.id,
          color: colorMap[dep.type],
          type: dep.type
        });
      }
    }
    return lines;
  });

  // Interactions
  private isDragging = false;
  private isResizing = false;
  private resizeDirection: 'left' | 'right' | null = null;
  private dragStartX = 0;
  private dragStartWidth = 0; // For panel resize
  private dragActivityId: number | null = null;
  private dragOriginalStart: Date | null = null;
  private dragOriginalDuration: number | null = null;

  // Linking state
  isLinking = false;
  linkSourceId: number | null = null;
  linkSourceType: 'start' | 'finish' | null = null;
  tempLinkStart = { x: 0, y: 0 };
  tempLinkEnd: { x: number, y: number } | null = null;

  // Editing state
  editingActivity: any = null;
  editForm = {
    name: '',
    startDate: '',
    duration: 1,
    percentComplete: 0
  };

  // Editor state
  isEditorVisible = false;

  // Side Window State (Resource Usage)
  isSideWindowVisible = false;
  selectedSideWindowResource: number | null = null;
  sideWindowHoverTimer: any;

  // Resources for dropdown
  resources = this.planningService.resources;

  onBookIconMouseEnter() {
    // Clear any close timer
    if (this.sideWindowHoverTimer) clearTimeout(this.sideWindowHoverTimer);
    this.isSideWindowVisible = true;
  }

  /* Toolbar State */
  isToolbarOpen = false;

  toggleToolbar(event: MouseEvent) {
    event.stopPropagation();
    this.isToolbarOpen = !this.isToolbarOpen;
  }

  // Close toolbar when clicking anywhere else
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isToolbarOpen) {
      this.isToolbarOpen = false;
    }
    if (this.isColumnDropdownOpen) {
      this.isColumnDropdownOpen = false;
    }
  }

  // Floating Window State
  isFloatingWindowVisible = false;
  floatingWindowType: 'resource' | 'evm' | 's-curve' = 'resource';
  floatingWindowResource: any = null;
  // Position is handled via CSS for "constant position"

  onOpenProfileRequest(resource: any) {
    this.openFloatingWindow('resource', resource);
  }

  onOpenSCurvesRequest() {
    console.log('onOpenSCurvesRequest called - opening S-Curve window');
    this.openFloatingWindow('s-curve');
  }

  onBookIconClick() {
    console.log('onBookIconClick called - opening EVM window');
    this.openFloatingWindow('evm');
  }

  onGearMouseEnter() {
    this.isEditorVisible = true;
  }

  private openFloatingWindow(type: 'resource' | 'evm' | 's-curve', resource: any = null) {
    this.floatingWindowType = type;
    this.floatingWindowResource = resource;
    this.isFloatingWindowVisible = true;
  }

  closeFloatingWindow() {
    this.isFloatingWindowVisible = false;
    this.floatingWindowResource = null;
    this.resourceProfileZoomLevel = 1; // Reset zoom on close
  }

  // Resource Profile Zoom
  resourceProfileZoomLevel = 1;

  zoomResourceProfile(amount: number) {
    const newZoom = this.resourceProfileZoomLevel + amount;
    if (newZoom >= 0.1 && newZoom <= 5) {
      this.resourceProfileZoomLevel = newZoom;
    }
  }
  printFloatingWindow() {
    window.print();
  }





  closeEditor() {
    this.isEditorVisible = false;
  }


  onSplitterMouseDown(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isResizingPanel = true;
    this.dragStartX = event.clientX;
    this.dragStartWidth = this.taskListWidth();
    this.addGlobalListeners();
  }

  onColumnResizeStart(event: MouseEvent, columnId: string) {
    event.preventDefault();
    event.stopPropagation();
    this.isResizingColumn = true;
    this.resizingColumnId = columnId;
    this.columnDragStartX = event.clientX;

    const col = this.columns().find(c => c.id === columnId);
    if (col) {
      this.columnDragStartWidth = col.width();
    }

    this.addGlobalListeners();
  }

  onTaskMouseDown(event: MouseEvent, activity: any) {
    if (this.isLinking) return;

    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragActivityId = activity.id;
    this.dragOriginalStart = new Date(activity.startDate);

    event.preventDefault();
    this.addGlobalListeners();
  }

  onHandleMouseDown(event: MouseEvent, activity: any, type: 'start' | 'finish') {
    event.stopPropagation();
    event.preventDefault();

    // Prevent creating relationships between WBS parent tasks
    if (this.isParentActivity(activity)) {
      return;
    }

    this.isLinking = true;
    this.linkSourceId = activity.id;
    this.linkSourceType = type;

    const actIdx = this.activities().indexOf(activity);
    const y = (actIdx * this.rowHeight) + (this.rowHeight / 2);
    let x;

    if (type === 'start') {
      x = this.getTaskLeft(activity);
    } else {
      x = this.getTaskLeft(activity) + this.getTaskWidth(activity);
    }

    this.tempLinkStart = { x, y };
    this.tempLinkEnd = { x, y };

    this.addGlobalListeners();
  }

  onHandleMouseUp(event: MouseEvent, activity: any, type: 'source' | 'target') {
    if (this.isLinking && this.linkSourceId && type === 'target') {
      if (this.linkSourceId !== activity.id) {
        this.planningService.addDependency(this.linkSourceId, activity.id);
      }
    }
  }

  private addGlobalListeners() {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onResizeMouseDown(event: MouseEvent, activity: any, direction: 'left' | 'right') {
    event.stopPropagation();
    event.preventDefault();

    this.isResizing = true;
    this.resizeDirection = direction;
    this.dragStartX = event.clientX;
    this.dragActivityId = activity.id;
    this.dragOriginalStart = new Date(activity.startDate);
    this.dragOriginalDuration = activity.duration;

    this.addGlobalListeners();
  }

  private onMouseMove = (event: MouseEvent) => {
    if (this.isResizingColumn) {
      this.handleColumnResize(event);
    } else if (this.isResizingPanel) {
      this.handlePanelResize(event);
    } else if (this.isDragging) {
      this.handleTaskMove(event);
    } else if (this.isResizing) {
      this.handleTaskResize(event);
    } else if (this.isLinking) {
      this.handleLinkMove(event);
    }
  }

  private handleColumnResize(event: MouseEvent) {
    if (!this.resizingColumnId) return;

    const deltaX = event.clientX - this.columnDragStartX;
    const newWidth = Math.max(30, this.columnDragStartWidth + deltaX); // Min width 30px

    const col = this.columns().find(c => c.id === this.resizingColumnId);
    if (col) {
      col.width.set(newWidth);
    }
  }

  private handlePanelResize(event: MouseEvent) {
    const deltaX = event.clientX - this.dragStartX;
    const newWidth = Math.max(200, Math.min(1200, this.dragStartWidth + deltaX));
    this.taskListWidth.set(newWidth);
  }

  private handleTaskResize(event: MouseEvent) {
    if (!this.dragActivityId || !this.dragOriginalStart || this.dragOriginalDuration === null) return;

    const deltaX = event.clientX - this.dragStartX;
    const deltaDays = Math.round(deltaX / (this.dayWidth * this.zoomLevel()));

    if (deltaDays === 0) return;

    const activity = this.activities().find(a => a.id === this.dragActivityId);
    if (!activity) return;

    let newStart = new Date(this.dragOriginalStart);
    let newDuration = this.dragOriginalDuration;

    if (this.resizeDirection === 'right') {
      newDuration = Math.max(1, this.dragOriginalDuration + deltaDays);
    } else {
      newStart.setDate(newStart.getDate() + deltaDays);
      newDuration = Math.max(1, this.dragOriginalDuration - deltaDays);
    }

    this.planningService.updateActivity({
      ...activity,
      startDate: newStart,
      duration: newDuration
    });
  }

  // Zoom functionality
  onWheel(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault();

      const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1;
      const currentZoom = this.zoomLevel();
      const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, currentZoom + zoomDelta));

      if (newZoom !== currentZoom) {
        this.zoomLevel.set(newZoom);
      }
    }
  }

  private handleTaskMove(event: MouseEvent) {
    if (!this.dragActivityId || !this.dragOriginalStart) return;

    const deltaX = event.clientX - this.dragStartX;
    const deltaDays = Math.round(deltaX / (this.dayWidth * this.zoomLevel()));

    if (deltaDays !== 0) {
      const newStart = new Date(this.dragOriginalStart);
      newStart.setDate(newStart.getDate() + deltaDays);

      const activity = this.activities().find(a => a.id === this.dragActivityId);
      if (activity) {
        this.planningService.updateActivity({
          ...activity,
          startDate: newStart
        });
      }
    }
  }

  private handleLinkMove(event: MouseEvent) {
    const svgElement = document.querySelector('.dependency-lines-container');
    if (svgElement) {
      const rect = svgElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.tempLinkEnd = { x, y };
    }
  }

  private onMouseUp = (event: MouseEvent) => {
    if (this.isLinking && this.linkSourceId && this.linkSourceType) {
      // Robust drop detection
      const target = document.elementFromPoint(event.clientX, event.clientY);
      if (target && target.classList.contains('link-handle')) {
        const targetId = Number(target.getAttribute('data-id'));
        const targetType = target.getAttribute('data-type') as 'start' | 'finish';

        if (targetId && targetType && this.linkSourceId !== targetId) {
          // Find the target activity and check if it's a parent
          const targetActivity = this.activities().find(a => a.id === targetId);

          // Prevent creating relationships to WBS parent tasks
          if (targetActivity && this.isParentActivity(targetActivity)) {
            // Don't create the relationship
          } else {
            let type: 'FS' | 'FF' | 'SS' | 'SF' = 'FS';

            // Determine Type
            if (this.linkSourceType === 'finish' && targetType === 'start') type = 'FS';
            else if (this.linkSourceType === 'finish' && targetType === 'finish') type = 'FF';
            else if (this.linkSourceType === 'start' && targetType === 'start') type = 'SS';
            else if (this.linkSourceType === 'start' && targetType === 'finish') type = 'SF';

            this.planningService.addDependency(this.linkSourceId, targetId, type);
          }
        }
      }
    }

    this.isDragging = false;
    this.isLinking = false;
    this.isResizingPanel = false; // Reset panel resize
    this.isResizingColumn = false; // Reset column resize
    this.resizingColumnId = null;
    this.isResizing = false;
    this.resizeDirection = null;
    this.dragActivityId = null;
    this.dragOriginalStart = null;
    this.dragOriginalDuration = null;
    this.linkSourceId = null;
    this.linkSourceType = null;
    this.tempLinkEnd = null;

    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp); // Use named function reference
  }

  // Edit Modal Methods
  openEditModal(activity: any) {
    this.editingActivity = activity;
    this.editForm = {
      name: activity.name,
      startDate: this.formatDateForInput(activity.startDate),
      duration: activity.duration,
      percentComplete: activity.percentComplete
    };
  }

  saveEdit() {
    if (this.editingActivity) {
      this.planningService.updateActivity({
        ...this.editingActivity,
        name: this.editForm.name,
        startDate: new Date(this.editForm.startDate),
        duration: this.editForm.duration,
        percentComplete: this.editForm.percentComplete
      });
      this.cancelEdit();
    }
  }

  cancelEdit() {
    this.editingActivity = null;
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Dependency Interaction
  onLinkClick(linkId: number, event: MouseEvent) {
    event.stopPropagation();
    const dep = this.planningService.dependencies().find(d => d.id === linkId);
    if (dep) {
      console.log('Dependency selected:', dep);
      this.planningService.setSelectedDependency(dep);
      this.isDependencyDetailsVisible.set(true);
      this.isActivityDetailsVisible.set(false);
    }
  }

  onLinkDoubleClick(linkId: number, event: MouseEvent) {
    event.stopPropagation();
    if (confirm('Delete this dependency?')) {
      this.planningService.removeDependency(linkId);
      if (this.planningService.selectedDependency()?.id === linkId) {
        this.closeDependencyDetails();
      }
    }
  }

  onActualStartChange(activity: any, val: string) {
    this.planningService.updateActivity({
      ...activity,
      actualStart: val ? new Date(val) : undefined
    });
  }

  onActualFinishChange(activity: any, val: string) {
    this.planningService.updateActivity({
      ...activity,
      actualFinish: val ? new Date(val) : undefined
    });
  }

  onBaselineStartChange(activity: any, val: string) {
    this.planningService.updateActivity({
      ...activity,
      baselineStartDate: val ? new Date(val) : undefined
    });
  }

  onBaselineFinishChange(activity: any, val: string) {
    this.planningService.updateActivity({
      ...activity,
      baselineEndDate: val ? new Date(val) : undefined
    });
  }

  onStartDateChange(activity: any, val: string) {
    this.planningService.updateActivity({
      ...activity,
      startDate: val ? new Date(val) : undefined
    });
  }

  // Activity Selection for Details Panel
  closeActivityDetails() {
    this.isActivityDetailsVisible.set(false);
    this.planningService.setSelectedActivity(null);
  }

  closeDependencyDetails() {
    this.isDependencyDetailsVisible.set(false);
    this.planningService.setSelectedDependency(null);
  }

  onDeselect(event: MouseEvent) {
    // If the click bubbled up to the container, deselect and close panels
    console.log('Deselecting activity/dependency');
    this.closeActivityDetails();
    this.closeDependencyDetails();
    this.planningService.setSelectedActivity(null);
    this.planningService.setSelectedDependency(null);
  }

  selectActivity(activity: any, event: MouseEvent) {
    event.stopPropagation();
    console.log('Activity selected:', activity);
    this.planningService.setSelectedActivity(activity);

    // Center the chart on the selected activity
    const timeline = document.querySelector('.timeline-panel');
    if (timeline) {
      const taskLeft = this.getTaskLeft(activity);
      const taskWidth = this.getTaskWidth(activity);
      const center = taskLeft + (taskWidth / 2);
      const viewportWidth = timeline.clientWidth;

      timeline.scrollTo({
        left: center - (viewportWidth / 2),
        behavior: 'smooth'
      });
    }
  }

  onActivityDoubleClick(activity: any, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault(); // Prevent text selection etc

    // Select it first (if not already)
    this.planningService.setSelectedActivity(activity);

    // Open details
    this.isActivityDetailsVisible.set(true);
    this.activeBottomTab.set('details');

    // Center the chart logic can remain here or move
    const timeline = document.querySelector('.timeline-panel');
    if (timeline) {
      const taskLeft = this.getTaskLeft(activity);
      const taskWidth = this.getTaskWidth(activity);
      const center = taskLeft + (taskWidth / 2);
      const viewportWidth = timeline.clientWidth;

      timeline.scrollTo({
        left: center - (viewportWidth / 2),
        behavior: 'smooth'
      });
    }
  }


  // Synchronize scroll between task list and timeline
  // Synchronize scroll between task list and timeline
  private isSyncingLeft = false;
  private isSyncingRight = false;

  onTaskListScroll(event: Event) {
    if (this.isSyncingLeft) return;
    this.isSyncingRight = true;

    const taskList = event.target as HTMLElement;
    const timeline = document.querySelector('.timeline-panel') as HTMLElement;
    const header = document.querySelector('.grid-header') as HTMLElement;

    if (timeline) {
      timeline.scrollTop = taskList.scrollTop;
    }

    if (header) {
      header.scrollLeft = taskList.scrollLeft;
    }

    setTimeout(() => this.isSyncingRight = false, 10);
  }

  onTimelineScroll(event: Event) {
    if (this.isSyncingRight) return;
    this.isSyncingLeft = true;

    const timeline = event.target as HTMLElement;
    this.timelineScrollX.set(timeline.scrollLeft);

    const taskList = document.querySelector('.task-list-rows') as HTMLElement;

    if (taskList) {
      taskList.scrollTop = timeline.scrollTop;
    }

    setTimeout(() => this.isSyncingLeft = false, 10);
  }
}
