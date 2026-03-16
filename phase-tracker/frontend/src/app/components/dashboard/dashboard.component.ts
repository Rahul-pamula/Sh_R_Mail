import { Component, OnInit } from '@angular/core';
import { PhaseService } from '../../services/phase.service';
import { Phase } from '../../models/phase.model';
import { CommonModule } from '@angular/common';
import { PhaseCardComponent } from '../phase-card/phase-card.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PhaseCardComponent, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  phases: Phase[] = [];
  newPhaseTitle: string = '';

  constructor(private phaseService: PhaseService) { }

  ngOnInit(): void {
    this.loadPhases();
  }

  loadPhases(): void {
    this.phaseService.getPhases().subscribe(data => {
      this.phases = data;
    });
  }

  createPhase(): void {
    if (!this.newPhaseTitle || !this.newPhaseTitle.trim()) return;
    this.phaseService.addPhase(this.newPhaseTitle).subscribe({
      next: (phase) => {
        this.phases.push(phase);
        this.newPhaseTitle = '';
      },
      error: (err) => {
        console.error('Error adding phase:', err);
        alert('Failed to add phase. Check console.');
      }
    });
  }

  onPhaseDeleted(phaseId: string): void {
    this.phases = this.phases.filter(p => p._id !== phaseId);
  }

  get totalTasks(): number {
    return this.phases.reduce((acc, phase) => acc + phase.tasks.length, 0);
  }

  get completedTasks(): number {
    return this.phases.reduce((acc, phase) => acc + phase.tasks.filter(t => t.done).length, 0);
  }

  get overallProgressInfo(): { percentage: number, text: string } {
    const total = this.totalTasks;
    if (total === 0) return { percentage: 0, text: 'No task added' };
    const percentage = Math.round((this.completedTasks / total) * 100);
    return { percentage, text: `${percentage}%` };
  }
}
