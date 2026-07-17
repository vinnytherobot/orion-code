export interface ApiKeyProps {
  id: string;
  userId: string;
  name: string;
  key: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export class ApiKey {
  private constructor(private props: ApiKeyProps) {}

  static create(input: {
    id: string;
    userId: string;
    name: string;
    key: string;
    expiresAt?: Date;
  }): ApiKey {
    return new ApiKey({
      id: input.id,
      userId: input.userId,
      name: input.name,
      key: input.key,
      lastUsedAt: null,
      expiresAt: input.expiresAt ?? null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: ApiKeyProps): ApiKey {
    return new ApiKey(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get name(): string { return this.props.name; }
  get key(): string { return this.props.key; }
  get lastUsedAt(): Date | null { return this.props.lastUsedAt; }
  get expiresAt(): Date | null { return this.props.expiresAt; }
  get createdAt(): Date { return this.props.createdAt; }

  isExpired(): boolean {
    if (!this.props.expiresAt) return false;
    return this.props.expiresAt < new Date();
  }

  markUsed(): void {
    this.props.lastUsedAt = new Date();
  }

  toJSON(): ApiKeyProps {
    return { ...this.props };
  }
}
