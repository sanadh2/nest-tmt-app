import { Test, TestingModule } from '@nestjs/testing';
import { MailModule } from './mail.module';

// Mock the MailService to avoid handlebars dependency issues
jest.mock('./mail.service', () => ({
  MailService: jest.fn().mockImplementation(() => ({
    sendWelcomeEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
  })),
}));

describe('MailModule', () => {
  let module: MailModule;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MailModule],
    }).compile();

    module = moduleFixture.get<MailModule>(MailModule);
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have the correct structure', () => {
    expect(typeof MailModule).toBe('function');
  });
}); 