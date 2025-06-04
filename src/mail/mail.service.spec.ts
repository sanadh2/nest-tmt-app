import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';
import { env } from '../config/env.validation';

jest.mock('nodemailer');

jest.mock('nodemailer-express-handlebars', () => {
        return jest.fn();
});

describe('MailService', () => {
  let service: MailService;
  let sendMailMock: jest.Mock;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    sendMailMock = jest.fn();
    // Mock nodemailer.createTransport to return an object with sendMail and use methods
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
      use: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);

    // Spy on logger methods
    loggerLogSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMail', () => {
    const to = 'test@example.com';
    const subject = 'Test Subject';
    const template = 'welcome-email';
    const context = { name: 'John' };

    it('should send email and log success message', async () => {
      sendMailMock.mockResolvedValueOnce({ messageId: 'abc123' });

      await service.sendMail(to, subject, template, context);

      expect(sendMailMock).toHaveBeenCalledWith({
        from: env.SMTP_FROM,
        to,
        subject,
        template,
        context,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Email sent to ${to} with subject "${subject}"`,
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should log error when sendMail throws', async () => {
      const error = new Error('SMTP failure');
      sendMailMock.mockRejectedValueOnce(error);

      await service.sendMail(to, subject, template, context);

      expect(sendMailMock).toHaveBeenCalledWith({
        from: env.SMTP_FROM,
        to,
        subject,
        template,
        context,
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to send email to ${to} with subject "${subject}": ${error.message}`,
        error.stack,
        'MailService',
      );
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });
});
