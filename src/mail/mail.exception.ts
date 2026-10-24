interface MailExceptionData {
  messageId: string;
  response?: string;
  rejected?: string[];
  accepted?: string[];
  smtpMessage?: any;
}

export class MailException extends Error {
  messageId: string;
  response?: string;
  rejected?: string[];
  accepted?: string[];
  smtpMessage?: unknown;
  constructor({
    messageId,
    rejected,
    response,
    accepted,
    smtpMessage,
  }: MailExceptionData) {
    super(MailException.name);
    this.messageId = messageId;
    this.response = response;
    this.rejected = rejected;
    this.accepted = accepted;
    this.smtpMessage = smtpMessage;
  }
}
