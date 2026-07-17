import { UserId } from '../value-objects/UserId.js';
import { Email } from '../value-objects/Email.js';
import { PasswordHash } from '../value-objects/PasswordHash.js';

export interface UserProps {
  id: UserId;
  name: string;
  email: Email;
  passwordHash: PasswordHash;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private props: UserProps) {}

  static create(input: {
    id: UserId;
    name: string;
    email: Email;
    passwordHash: PasswordHash;
  }): User {
    const now = new Date();
    return new User({
      id: input.id,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  get id(): UserId { return this.props.id; }
  get name(): string { return this.props.name; }
  get email(): Email { return this.props.email; }
  get passwordHash(): PasswordHash { return this.props.passwordHash; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  toJSON(): UserProps {
    return { ...this.props };
  }
}
