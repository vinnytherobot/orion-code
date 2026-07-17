export class PasswordHash {
  private constructor(public readonly value: string) {}

  static fromHash(hash: string): PasswordHash {
    return new PasswordHash(hash);
  }

  equals(other: PasswordHash): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
