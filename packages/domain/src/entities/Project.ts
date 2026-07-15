export interface ProjectProps {
  id: string;
  name: string;
  rootPath: string;
  description: string;
  taskIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectAnalysis {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  progress: number;
}

export class Project {
  private constructor(private props: ProjectProps) {}

  static create(input: { id: string; name: string; rootPath: string; description?: string }): Project {
    return new Project({
      id: input.id,
      name: input.name,
      rootPath: input.rootPath,
      description: input.description ?? "",
      taskIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ProjectProps): Project {
    return new Project(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get rootPath(): string {
    return this.props.rootPath;
  }

  get description(): string {
    return this.props.description;
  }

  get taskIds(): readonly string[] {
    return this.props.taskIds;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  addTask(taskId: string): void {
    if (!this.props.taskIds.includes(taskId)) {
      this.props.taskIds.push(taskId);
      this.props.updatedAt = new Date();
    }
  }

  removeTask(taskId: string): void {
    this.props.taskIds = this.props.taskIds.filter((id) => id !== taskId);
    this.props.updatedAt = new Date();
  }

  toJSON(): ProjectProps {
    return { ...this.props };
  }
}
