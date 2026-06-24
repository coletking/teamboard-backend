import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsService } from '../projects/projects.service';
import { TasksService, StatusBreakdown } from '../tasks/tasks.service';
import { ProjectRole } from '../../schemas/projects/project.schema';

export interface DashboardProjectSummary {
  id: string;
  name: string;
  role: ProjectRole | undefined;
  taskCount: number;
}

export interface DashboardStats {
  projectCount: number;
  taskCount: number;
  tasksByStatus: StatusBreakdown;
  projects: DashboardProjectSummary[];
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
  ) {}

  async getStats(userId: string): Promise<DashboardStats> {
    const projects = await this.projectsService.findAllForUser(userId);
    const projectIds = projects.map((p) => p._id as Types.ObjectId);

    const [tasksByStatus, perProject] = await Promise.all([
      this.tasksService.countByStatusForProjects(projectIds),
      this.tasksService.countPerProject(projectIds),
    ]);

    const taskCount =
      tasksByStatus.todo + tasksByStatus.in_progress + tasksByStatus.done;

    return {
      projectCount: projects.length,
      taskCount,
      tasksByStatus,
      projects: projects.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        role: this.projectsService.getRole(p, userId),
        taskCount: perProject.get(p._id.toString()) ?? 0,
      })),
    };
  }
}
