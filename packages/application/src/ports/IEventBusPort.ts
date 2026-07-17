import type { DomainEvent } from '@orion/domain';

export interface IEventBusPort {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
