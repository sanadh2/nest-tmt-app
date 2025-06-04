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
    // Determine the absolute path to the templates directory.
    // Using process.cwd() ensures the path is relative to the project root,
    // which is more reliable for static assets that might not be copied
    // directly alongside compiled JS files in the 'dist' folder.
    // This assumes the 'src' directory is accessible at runtime.
    const templatesDir = join(process.cwd(), 'src', 'mail', 'templates');

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false, // Set to true if using port 465 (e.g., for SSL/TLS)
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      // If you encounter issues with self-signed certificates in development,
      // you might need to add this (but be cautious in production):
      // tls: {
      //   rejectUnauthorized: false,
      // },
    });

    // Configure nodemailer to use the handlebars plugin
    this.transporter.use(
      'compile', // This hook tells nodemailer to use the plugin for 'compile' events
      hbs({
        // hbs is now correctly imported as the default function
        viewEngine: {
          extname: '.hbs', // File extension for your templates
          layoutsDir: templatesDir, // Use the dynamically determined path
          defaultLayout: 'verify', // Set to false if you don't use a default layout
          partialsDir: join(templatesDir, 'partials'), // Optional: Directory for partials
        },
        viewPath: templatesDir, // Use the dynamically determined path
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
