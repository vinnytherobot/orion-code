export interface RefreshTokenProps {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export class RefreshToken {
  private constructor(private props: RefreshTokenProps) {}

  static create(input: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  }): RefreshToken {
    return new RefreshToken({
      id: input.id,
      userId: input.userId,
      token: input.token,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get token(): string { return this.props.token; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get createdAt(): Date { return this.props.createdAt; }

  isExpired(): boolean {
    return this.props.expiresAt < new Date();
  }

  toJSON(): RefreshTokenProps {
    return { ...this.props };
  }
}
