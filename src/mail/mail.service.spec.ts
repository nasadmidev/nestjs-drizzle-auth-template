import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Logger } from '@nestjs/common';

describe('MailService', () => {
  let service: MailService;
  let mailerServiceMock: DeepMockProxy<MailerService>;

  beforeEach(async () => {
    mailerServiceMock = mockDeep<MailerService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mailerServiceMock,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw a MailException when email is not included on the accepted array', async () => {
    mailerServiceMock.sendMail.mockResolvedValue({
      messageId: 'MESSAGE_123',
      accepted: ['another'],
      envelope: { from: 'server', to: ['user'] },
    });
    await expect(
      service.mail('user', 'Subject', 'template', {}),
    ).rejects.toMatchObject({
      name: 'MailException',
      accepted: ['another'],
      rejected: undefined,
      retryable: false,
    });
  });

  it('normalizes a temporary SMTP failure and retains its original cause', async () => {
    const smtpError = Object.assign(new Error('Connection timed out'), {
      code: 'ETIMEDOUT',
      command: 'CONN',
      responseCode: 421,
      response: '421 Service temporarily unavailable',
      permanent: false,
    });
    mailerServiceMock.sendMail.mockRejectedValue(smtpError);

    await expect(
      service.mail('user', 'Subject', 'template', {}),
    ).rejects.toMatchObject({
      name: 'MailException',
      message: 'Connection timed out',
      code: 'ETIMEDOUT',
      command: 'CONN',
      responseCode: 421,
      response: '421 Service temporarily unavailable',
      permanent: false,
      retryable: true,
      cause: smtpError,
    });
  });

  it('marks permanent SMTP rejections as not retryable', async () => {
    const smtpError = Object.assign(new Error('Authentication failed'), {
      code: 'EAUTH',
      responseCode: 535,
      permanent: true,
    });
    mailerServiceMock.sendMail.mockRejectedValue(smtpError);

    await expect(
      service.mail('user', 'Subject', 'template', {}),
    ).rejects.toMatchObject({
      code: 'EAUTH',
      responseCode: 535,
      permanent: true,
      retryable: false,
    });
  });

  it('wraps non-Error rejections as an unknown mail failure', async () => {
    mailerServiceMock.sendMail.mockRejectedValue('unexpected failure');

    await expect(
      service.mail('user', 'Subject', 'template', {}),
    ).rejects.toMatchObject({
      name: 'MailException',
      message: 'Email delivery failed with an unknown error',
      retryable: false,
      cause: 'unexpected failure',
    });
  });

  it('should log the messageId and email when the email is sent it properly', async () => {
    mailerServiceMock.sendMail.mockResolvedValue({
      messageId: 'MESSAGE_123',
      accepted: ['user'],
      envelope: { from: 'server', to: ['user'] },
    });
    const spy = jest.spyOn(Logger.prototype, 'log');
    await service.mail('user', 'Subject', 'template', {});
    expect(spy).toHaveBeenCalledWith(`Email sent to user with ID MESSAGE_123`);
  });
});
