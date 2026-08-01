export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UrlValidationError'
  }
}

export class UrlConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UrlConflictError'
  }
}

export class UrlNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UrlNotFoundError'
  }
}

export class UrlQuotaExceededError extends Error {
  constructor(
    message: string,
    readonly code: 'DYNAMIC_QR_LIMIT_REACHED' | 'ADAPTIVE_QR_LIMIT_REACHED'
  ) {
    super(message)
    this.name = 'UrlQuotaExceededError'
  }
}
