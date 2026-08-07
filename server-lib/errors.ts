/** Typed HTTP error helpers so route handlers can throw and be mapped centrally. */

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

export function notFound(msg = 'Not found'): never {
  throw new HttpError(404, msg);
}

export function forbidden(msg = 'Forbidden'): never {
  throw new HttpError(403, msg);
}

export function unauthorized(msg = 'Unauthorized'): never {
  throw new HttpError(401, msg);
}

export function badRequest(msg: string): never {
  throw new HttpError(400, msg);
}