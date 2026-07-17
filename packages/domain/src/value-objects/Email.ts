import { AppError, type Result, fail, ok } from '@orion/shared';

export class Email {
  private constructor(public readonly value: string) {}

  static create(value: string): Result<Email, AppError> {
    const trimmed = value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return fail(AppError.conflict('Invalid email format'));
    }
    return ok(new Email(trimmed));
  }

  static from(value: string): Email {
    return new Email(value);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
