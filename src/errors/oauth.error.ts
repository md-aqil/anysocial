export class OAuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'OAuthError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, OAuthError.prototype);
  }
}
