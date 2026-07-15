import type { Agent } from "../entities/Agent.js";

export interface IAgentRepository {
  findById(id: string): Promise<Agent | null>;
  findByName(name: string): Promise<Agent | null>;
  findAll(): Promise<Agent[]>;
  save(agent: Agent): Promise<void>;
  delete(id: string): Promise<void>;
}
