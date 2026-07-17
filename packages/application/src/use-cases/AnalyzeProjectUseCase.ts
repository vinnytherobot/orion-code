import type { ITaskRepository, Project, ProjectAnalysis } from '@orion/domain';
import { type AppError, type Result, ok } from '@orion/shared';

export interface ProjectAnalysisResult {
  project: {
    id: string;
    name: string;
    rootPath: string;
  };
  analysis: ProjectAnalysis;
}

export class AnalyzeProjectUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(project: Project): Promise<Result<ProjectAnalysisResult, AppError>> {
    const allTasks = await this.taskRepository.findAll();
    const projectTasks = allTasks.filter((t) => project.taskIds.includes(t.id.toString()));

    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(
      (t) => t.status.isTerminal() && t.status.value === 'completed',
    ).length;
    const failedTasks = projectTasks.filter((t) => t.status.value === 'failed').length;
    const pendingTasks = projectTasks.filter((t) => !t.status.isTerminal()).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return ok({
      project: {
        id: project.id,
        name: project.name,
        rootPath: project.rootPath,
      },
      analysis: {
        totalTasks,
        completedTasks,
        failedTasks,
        pendingTasks,
        progress,
      },
    });
  }
}