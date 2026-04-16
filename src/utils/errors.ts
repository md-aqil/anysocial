export class MediaValidationError extends Error {
  public readonly code: string;
  public readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'MediaValidationError';
    this.code = 'MEDIA_VALIDATION_ERROR';
    this.details = details;
    Object.setPrototypeOf(this, MediaValidationError.prototype);
  }
}

export class PlatformFormatError extends Error {
  public readonly code: string;
  public readonly platform: string;

  constructor(message: string, platform: string) {
    super(message);
    this.name = 'PlatformFormatError';
    this.code = 'PLATFORM_FORMAT_ERROR';
    this.platform = platform;
    Object.setPrototypeOf(this, PlatformFormatError.prototype);
  }
}

export class QueueEnqueueError extends Error {
  public readonly code: string;
  public readonly jobId?: string;

  constructor(message: string, jobId?: string) {
    super(message);
    this.name = 'QueueEnqueueError';
    this.code = 'QUEUE_ENQUEUE_ERROR';
    this.jobId = jobId;
    Object.setPrototypeOf(this, QueueEnqueueError.prototype);
  }
}

export class PartialPublishError extends Error {
  public readonly code: string;
  public readonly results: Array<{ platform: string; success: boolean; error?: string }>;

  constructor(
    message: string,
    results: Array<{ platform: string; success: boolean; error?: string }>
  ) {
    super(message);
    this.name = 'PartialPublishError';
    this.code = 'PARTIAL_PUBLISH_ERROR';
    this.results = results;
    Object.setPrototypeOf(this, PartialPublishError.prototype);
  }
}

export class SchedulingError extends Error {
  public readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = 'SchedulingError';
    this.code = 'SCHEDULING_ERROR';
    Object.setPrototypeOf(this, SchedulingError.prototype);
  }
}
