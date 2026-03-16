import { Task } from './task.model';

export interface Phase {
  _id?: string;
  title: string;
  tasks: Task[];
  createdAt?: string;
  updatedAt?: string;
}
