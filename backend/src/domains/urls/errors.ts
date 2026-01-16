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
