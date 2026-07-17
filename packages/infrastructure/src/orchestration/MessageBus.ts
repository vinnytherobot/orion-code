import { EventEmitter } from 'node:events';

export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: 'request' | 'response' | 'notification';
  payload: Record<string, unknown>;
  timestamp: Date;
}

export class MessageBus extends EventEmitter {
  private messageHistory: AgentMessage[] = [];
  private maxHistorySize = 1000;

  async send(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
    };

    this.messageHistory.push(fullMessage);
    
    // Trim history
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }

    // Emit for WebSocket broadcasting
    this.emit('message', fullMessage);

    // Route to specific agent or broadcast
    if (message.to === 'broadcast') {
      this.emit('broadcast', fullMessage);
    } else {
      this.emit(`agent:${message.to}`, fullMessage);
    }
  }

  async subscribe(agentId: string, handler: (message: AgentMessage) => void): Promise<void> {
    this.on(`agent:${agentId}`, handler);
  }

  async unsubscribe(agentId: string, handler: (message: AgentMessage) => void): Promise<void> {
    this.off(`agent:${agentId}`, handler);
  }

  getHistory(agentId?: string, limit = 50): AgentMessage[] {
    let history = this.messageHistory;
    
    if (agentId) {
      history = history.filter(m => m.from === agentId || m.to === agentId || m.to === 'broadcast');
    }
    
    return history.slice(-limit);
  }
}
