export interface DrizzleExceptionData {
  code: string;
  column?: string;
  message: string;
}

export class DrizzleException extends Error {
  code: string;
  column?: string;
  message: string;

  constructor({ code, column, message }: DrizzleExceptionData) {
    super(message);
    this.code = code;
    this.column = column;
    this.message = message;
    this.name = 'DrizzleException';
  }
}
