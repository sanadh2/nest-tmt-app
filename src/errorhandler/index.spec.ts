import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AllExceptionsFilter } from './index';
import { Request, Response } from 'express';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockLogger: Logger;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    mockLogger = new Logger();
    jest.spyOn(mockLogger, 'error').mockImplementation(() => {});
    jest.spyOn(mockLogger, 'warn').mockImplementation(() => {});
    jest.spyOn(mockLogger, 'debug').mockImplementation(() => {});

    const moduleRef = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    filter = moduleRef.get<AllExceptionsFilter>(AllExceptionsFilter);

    (filter as any)['logger'] = mockLogger;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      method: 'GET',
      url: '/test-url',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getNext: jest.fn(),
      }),
      getType: jest.fn().mockReturnValue('http'),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle HttpException and return appropriate status and message', () => {
      const httpException = new HttpException(
        'Forbidden',
        HttpStatus.FORBIDDEN,
      );

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.FORBIDDEN,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Forbidden',
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `HTTP 403 - GET /test-url - "Forbidden"`,
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle generic Error and return 500 Internal Server Error', () => {
      const genericError = new Error('Something went wrong');

      filter.catch(genericError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Internal server error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        `HTTP 500 - GET /test-url - "Internal server error"`,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith('Internal server error');
      expect(mockLogger.debug).toHaveBeenCalledWith(genericError.stack);
    });

    it('should log an error for 5xx status codes', () => {
      const serverError = new HttpException(
        'Service Unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );

      filter.catch(serverError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `HTTP 503 - GET /test-url - "Service Unavailable"`,
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should log a warning for non-5xx status codes', () => {
      const badRequest = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(badRequest, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `HTTP 400 - GET /test-url - "Bad Request"`,
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should include exception stack in debug log if it is an Error instance', () => {
      const errorWithStack = new Error('Detailed error message');
      errorWithStack.stack = 'Mocked stack trace\nline 1\nline 2';

      filter.catch(errorWithStack, mockArgumentsHost);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Mocked stack trace\nline 1\nline 2',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith('Internal server error');
    });

    it('should handle non-Error, non-HttpException types gracefully', () => {
      const unknownException = 'Just a string error';

      filter.catch(unknownException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: mockRequest.url,
        error: 'Internal server error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        `HTTP 500 - GET /test-url - "Internal server error"`,
      );
      expect(mockLogger.warn).not.toHaveBeenCalledWith(unknownException);
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });
});
