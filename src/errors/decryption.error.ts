export class DecryptionError extends Error {
  public readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
    this.code = 'DECRYPTION_FAILED';
    Object.setPrototypeOf(this, DecryptionError.prototype);
  }
}
