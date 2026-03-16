import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Phase } from '../../models/phase.model';
import { PhaseService } from '../../services/phase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskItemComponent } from '../task-item/task-item.component';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-phase-card',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskItemComponent],
  templateUrl: './phase-card.component.html',
  styleUrls: ['./phase-card.component.css']
})
export class PhaseCardComponent {
  @Input() phase!: Phase;
  @Output() deleted = new EventEmitter<string>();

  isEditing: boolean = false;
  editTitle: string = '';
  newTaskText: string = '';

  constructor(private phaseService: PhaseService) {}

  startEdit(): void {
    console.log('[PhaseCard] startEdit', this.phase?._id);
    this.editTitle = this.phase.title;
    this.isEditing = true;
  }

  saveEdit(): void {
    if (!this.editTitle.trim() || !this.phase._id) return;
    this.phaseService.updatePhase(this.phase._id, this.editTitle).subscribe(updated => {
      this.phase.title = updated.title;
      this.isEditing = false;
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
  }

  deletePhase(): void {
    if (!this.phase._id) return;
    if (confirm('Are you sure you want to delete this phase?')) {
      console.log('[PhaseCard] deletePhase', this.phase._id);
      this.phaseService.deletePhase(this.phase._id).subscribe(() => {
        this.deleted.emit(this.phase._id);
      });
    }
  }

  addTask(): void {
    if (!this.newTaskText.trim() || !this.phase._id) return;
    console.log('[PhaseCard] addTask', this.phase._id, this.newTaskText);
    this.phaseService.addTask(this.phase._id, this.newTaskText).subscribe(updatedPhase => {
      this.phase.tasks = updatedPhase.tasks;
      this.newTaskText = '';
    });
  }

  onTaskUpdated(updatedPhase: Phase): void {
    // Replace current tasks array with updated one
    this.phase.tasks = updatedPhase.tasks;
  }

  get progressPercentage(): number {
    if (this.phase.tasks.length === 0) return 0;
    const completed = this.phase.tasks.filter(t => t.done).length;
    return Math.round((completed / this.phase.tasks.length) * 100);
  }
}
