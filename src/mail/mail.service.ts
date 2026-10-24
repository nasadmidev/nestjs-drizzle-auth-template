import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { MailException } from './mail.exception';

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { messageId, accepted, message, rejected, response } =
      await this.mailer.sendMail({
        to: email,
        subject,
        template,
        context: data,
      });
    if (accepted && !accepted.includes(email)) {
      this.logger.warn(
        `Email delivery failed to ${email} with ID ${messageId} and message ${message || 'NOT_PROVIDED'}`,
      );
      throw new MailException({
        messageId,
        accepted,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        smtpMessage: message,
        rejected,
        response,
      });
    }

    this.logger.log(`Email sent to ${email} with ID ${messageId}`);
  }
}
