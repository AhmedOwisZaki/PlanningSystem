import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningService } from '../../services/planning.service';
import { ActivityDetailsComponent } from '../activity-details/activity-details.component';
import { EditorComponent } from '../editor/editor.component';

@Component({
  selector: 'app-gantt',
  standalone: true,
  imports: [CommonModule, FormsModule, ActivityDetailsComponent, EditorComponent],
  templateUrl: './gantt.component.html',
  styleUrls: ['./gantt.component.scss']
})
export class GanttComponent {
  // ... (keep phaseColors up to handleZoom)
  private phaseColors = [
    '#e3f2fd', // Light Blue
    '#e8f5e9', // Light Green
    '#fff3e0', // Light Orange
    '#f3e5f5', // Light Purple
    '#ffebee', // Light Red
    '#e0f2f1', // Light Teal
    '#fff8e1', // Light Amber
    '#fce4ec', // Light Pink
  ];

  getPhaseColor(activity: any): string {
    // 1. Identify the Phase ancestor (child of Root ID 0)
    let current = activity;
    const allActivities = this.activities();

    // Safety: prevent infinite loop if data corrupt
    let depth = 0;
    while (current && current.parentId !== 0 && current.parentId !== null && depth < 20) {
      current = allActivities.find(a => a.id === current.parentId);
      depth++;
    }

    // Root node (ID 0) gets specific color (Header Grey)
    if (activity.id === 0) return '#e9ecef';

    // If we found a top-level Phase (parent is 0)
    if (current && current.parentId === 0) {
      // Use the Phase's ID to deterministically pick a color
      const colorIndex = (current.id % this.phaseColors.length);
      return this.phaseColors[colorIndex];
    }

    return '#ffffff'; // Fallback
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

  activities = this.planningService.activities;
  projectStartDate = this.planningService.projectStartDate;
  projectEndDate = this.planningService.projectEndDate;

  // View settings
  dayWidth = 40; // pixels per day
  headerHeight = 60;
  rowHeight = 30; // With box-sizing: border-box, this includes the 1px border
  zoomLevel = signal(1);
  minZoom = 0.1;
  maxZoom = 6;

  // Computed timeline
  totalDays = computed(() => {
    const start = this.planningService.projectStartDate();
    const end = this.planningService.projectEndDate();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 includes start day
  });

  timelineWidth = computed(() => this.totalDays() * this.dayWidth * this.zoomLevel());

  days = computed(() => {
    const daysArr = [];
    const start = new Date(this.planningService.projectStartDate());
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
  getTaskLeft(startDate: Date): number {
    const start = this.planningService.projectStartDate();
    const diffTime = startDate.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays * this.dayWidth * this.zoomLevel();
  }

  getTaskWidth(duration: number): number {
    return duration * this.dayWidth * this.zoomLevel();
  }

  // Computed visible activities (respecting expand/collapse)
  visibleActivities = computed(() => {
    const allActivities = this.activities();
    const visible: any[] = [];

    const addVisibleActivities = (parentId: number | null | undefined) => {
      const children = allActivities.filter(a => a.parentId === parentId);
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
    return this.planningService.isParent(activity.id);
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
      'FS': '#f033f0ff', // Blue
      'FF': '#51cf66', // Green
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
          x1 = this.getTaskLeft(source.startDate) + this.getTaskWidth(source.duration);
        } else {
          x1 = this.getTaskLeft(source.startDate);
        }

        // Target Point X (with Arrow Gap)
        const arrowLen = 12;
        if (tgtType === 'start') {
          x2 = this.getTaskLeft(target.startDate) - arrowLen;
        } else {
          x2 = this.getTaskLeft(target.startDate) + this.getTaskWidth(target.duration) + arrowLen;
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

  onGearMouseEnter() {
    this.isEditorVisible = true;
  }

  closeEditor() {
    this.isEditorVisible = false;
  }

  // Selected activity for details panel (from service)
  selectedActivity = this.planningService.selectedActivity;

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
      x = this.getTaskLeft(activity.startDate);
    } else {
      x = this.getTaskLeft(activity.startDate) + this.getTaskWidth(activity.duration);
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
    if (this.isDragging) {
      this.handleTaskMove(event);
    } else if (this.isResizing) {
      this.handleTaskResize(event);
    } else if (this.isLinking) {
      this.handleLinkMove(event);
    }
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

  // Dependency Deletion
  onLinkClick(linkId: number) {
    if (confirm('Delete this dependency?')) {
      this.planningService.removeDependency(linkId);
    }
  }

  // Activity Selection for Details Panel
  selectActivity(activity: any, event: MouseEvent) {
    event.stopPropagation();
    console.log('Activity selected:', activity);
    this.planningService.setSelectedActivity(activity);

    // Center the chart on the selected activity
    const timeline = document.querySelector('.timeline-panel');
    if (timeline) {
      const taskLeft = this.getTaskLeft(activity.startDate);
      const taskWidth = this.getTaskWidth(activity.duration);
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

    if (timeline) {
      timeline.scrollTop = taskList.scrollTop;
    }

    setTimeout(() => this.isSyncingRight = false, 10);
  }

  onTimelineScroll(event: Event) {
    if (this.isSyncingRight) return;
    this.isSyncingLeft = true;

    const timeline = event.target as HTMLElement;
    const taskList = document.querySelector('.task-list-rows') as HTMLElement;

    if (taskList) {
      taskList.scrollTop = timeline.scrollTop;
    }

    setTimeout(() => this.isSyncingLeft = false, 10);
  }
}
