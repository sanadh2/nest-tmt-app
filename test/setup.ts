import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.APP_DOMAIN = 'http://localhost:3000';
process.env.FRONTEND_URL = 'http://localhost:3001'; 