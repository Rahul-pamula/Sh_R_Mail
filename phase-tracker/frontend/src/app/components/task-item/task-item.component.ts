import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Task } from '../../models/task.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhaseService } from '../../services/phase.service';
import { Phase } from '../../models/phase.model';

@Component({
  selector: 'app-task-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-item.component.html',
  styleUrls: ['./task-item.component.css']
})
export class TaskItemComponent {
  @Input() task!: Task;
  @Output() taskChanged = new EventEmitter<Phase>();

  isEditing: boolean = false;
  editText: string = '';

  constructor(private phaseService: PhaseService) {}

  toggleDone(): void {
    if (!this.task._id) return;
    const newStatus = !this.task.done;
    
    // Optimistic UI update
    this.task.done = newStatus;
    
    this.phaseService.updateTask(this.task._id, undefined, newStatus).subscribe({
      next: (phase) => this.taskChanged.emit(phase),
      error: () => {
        // Revert on error
        this.task.done = !newStatus;
      }
    });
  }

  startEdit(): void {
    this.editText = this.task.text;
    this.isEditing = true;
  }

  saveEdit(): void {
    if (!this.editText.trim() || !this.task._id) return;
    this.phaseService.updateTask(this.task._id, this.editText).subscribe(phase => {
      this.task.text = this.editText;
      this.isEditing = false;
      this.taskChanged.emit(phase);
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
  }

  deleteTask(): void {
    if (!this.task._id) return;
    if (confirm('Delete this task?')) {
      this.phaseService.deleteTask(this.task._id).subscribe(phase => {
        this.taskChanged.emit(phase);
      });
    }
  }
}
