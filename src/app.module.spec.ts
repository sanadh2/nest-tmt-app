import { AppModule } from './app.module';

describe('AppModule', () => {
  it('should be defined', () => {
    expect(AppModule).toBeDefined();
  });

  it('should have the correct structure', () => {
    expect(typeof AppModule).toBe('function');
  });
}); 