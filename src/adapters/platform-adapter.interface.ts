export interface PlatformPayload {
  caption: string;
  mediaUrls: string[];
  metadata: Record<string, unknown>;
  platformSpecificFields: Record<string, unknown>;
}

export interface PublishResult {
  success: boolean;
  platformPostId: string;
  url: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PlatformAdapter {
  prepareContent(content: string, platform: string): PlatformPayload;
  formatMediaUrls(mediaUrls: string[], platform: string): string[];
  validatePayload(payload: PlatformPayload): ValidationResult;
  publish(accountId: string, payload: PlatformPayload): Promise<PublishResult>;
  deletePost?(accountId: string, platformPostId: string, accessToken?: string): Promise<boolean>;
}
