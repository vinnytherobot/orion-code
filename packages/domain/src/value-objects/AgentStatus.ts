export type AgentStatusValue = "idle" | "running" | "waiting" | "failed" | "completed";

export class AgentStatus {
  private constructor(public readonly value: AgentStatusValue) {}

  static idle(): AgentStatus {
    return new AgentStatus("idle");
  }

  static running(): AgentStatus {
    return new AgentStatus("running");
  }

  static waiting(): AgentStatus {
    return new AgentStatus("waiting");
  }

  static failed(): AgentStatus {
    return new AgentStatus("failed");
  }

  static completed(): AgentStatus {
    return new AgentStatus("completed");
  }

  static from(value: AgentStatusValue): AgentStatus {
    return new AgentStatus(value);
  }

  isIdle(): boolean {
    return this.value === "idle";
  }

  isRunning(): boolean {
    return this.value === "running";
  }

  isTerminal(): boolean {
    return this.value === "completed" || this.value === "failed";
  }

  equals(other: AgentStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
