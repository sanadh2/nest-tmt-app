import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import { join } from 'path';
import { env } from '../config/env.validation';

interface MailOptionsWithTemplate extends nodemailer.SendMailOptions {
  template: string;
  context: any;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  constructor() {
    const templatesDir = join(process.cwd(), 'src', 'mail', 'templates');

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.transporter.use(
      'compile',
      hbs({
        viewEngine: {
          extname: '.hbs',
          layoutsDir: templatesDir,
          defaultLayout: 'verify',
          partialsDir: join(templatesDir, 'partials'),
        },
        viewPath: templatesDir,
        extName: '.hbs',
      }),
    );
  }

  /**
   * Sends an email using a Handlebars template.
   * @param to The recipient's email address.
   * @param subject The subject of the email.
   * @param template The name of the Handlebars template file (e.g., 'welcome-email').
   * This should correspond to a file like 'welcome-email.hbs' in your templates directory.
   * @param context An object containing data to be passed to the Handlebars template.
   */
  async sendMail(to: string, subject: string, template: string, context: any) {
    try {
      await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        template,
        context,
      } as MailOptionsWithTemplate);
      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (err: any) {
      this.logger.error(
        `Failed to send email to ${to} with subject "${subject}": ${err?.message}`,
        err?.stack,
        'MailService',
      );
    }
  }
}
