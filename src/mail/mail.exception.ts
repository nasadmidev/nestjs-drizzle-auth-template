export interface MailExceptionData {
  messageId?: string;
  code?: string;
  command?: string;
  responseCode?: number;
  response?: string;
  permanent?: boolean;
  retryable?: boolean;
  accepted?: string[];
  rejected?: string[];
  message?: string;
  cause?: unknown;
}

export class MailException extends Error {
  readonly messageId?: string;
  readonly code?: string;
  readonly command?: string;
  readonly responseCode?: number;
  readonly response?: string;
  readonly permanent?: boolean;
  readonly retryable?: boolean;
  readonly accepted?: string[];
  readonly rejected?: string[];

  constructor(data: MailExceptionData) {
    super(data.message ?? 'Email delivery failed', { cause: data.cause });
    this.name = MailException.name;
    this.messageId = data.messageId;
    this.code = data.code;
    this.command = data.command;
    this.responseCode = data.responseCode;
    this.response = data.response;
    this.permanent = data.permanent;
    this.retryable = data.retryable;
    this.accepted = data.accepted;
    this.rejected = data.rejected;
  }
}
