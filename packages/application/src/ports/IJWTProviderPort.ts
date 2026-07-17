export interface JwtPayload {
  sub: string;
  type: string;
}

export interface IJWTProviderPort {
  sign(payload: Record<string, unknown>, expiresIn: string): string;
  verify(token: string): JwtPayload | null;
}
