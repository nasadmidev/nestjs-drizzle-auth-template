import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { MailException } from './mail.exception';

interface MailerError extends Error {
  code?: string;
  command?: string;
  response?: string;
  responseCode?: number;
  permanent?: boolean;
  rejected?: string[];
  accepted?: string[];
}

function isMailerError(error: unknown): error is MailerError {
  return error instanceof Error;
}

function toMailException(error: unknown): MailException {
  const mailerError = isMailerError(error) ? error : undefined;
  const responseCode = mailerError?.responseCode;
  const transientCode = [
    'ECONNECTION',
    'ETIMEDOUT',
    'EDNS',
    'ESOCKET',
  ].includes(mailerError?.code ?? '');
  const retryable =
    mailerError?.permanent !== undefined
      ? !mailerError.permanent
      : responseCode !== undefined
        ? responseCode >= 400 && responseCode < 500
        : transientCode;

  return new MailException({
    message:
      mailerError?.message ?? 'Email delivery failed with an unknown error',
    code: mailerError?.code,
    command: mailerError?.command,
    response: mailerError?.response,
    responseCode,
    permanent: mailerError?.permanent,
    retryable,
    rejected: mailerError?.rejected,
    accepted: mailerError?.accepted,
    cause: error,
  });
}

@Injectable()
export class MailService {
  private readonly logger: Logger = new Logger(MailService.name);
  constructor(private readonly mailer: MailerService) {}

  async mail<T extends object>(
    email: string,
    subject: string,
    template: string,
    data: T,
  ) {
    try {
      const { messageId, accepted, rejected, response } =
        await this.mailer.sendMail({
          to: email,
          subject,
          template,
          context: data,
        });
      if (!accepted?.includes(email)) {
        throw new MailException({
          message: `SMTP server did not accept the recipient ${email}`,
          messageId,
          accepted,
          rejected,
          response,
          retryable: false,
        });
      }

      this.logger.log(`Email sent to ${email} with ID ${messageId}`);
    } catch (error: unknown) {
      const mailException =
        error instanceof MailException ? error : toMailException(error);
      this.logger.error(
        `Email delivery failed (code=${mailException.code ?? 'UNKNOWN'}, command=${mailException.command ?? 'UNKNOWN'}, responseCode=${mailException.responseCode ?? 'UNKNOWN'})`,
      );
      throw mailException;
    }
  }
}
