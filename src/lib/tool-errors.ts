export class ToolResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolResourceNotFoundError';
  }
}
