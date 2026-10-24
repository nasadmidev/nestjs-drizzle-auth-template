import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { MailException } from './mail.exception';
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
    ).rejects.toThrow(MailException);
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
