import { describe, it, expect } from 'vitest';
import { formatApiError } from '../api/client';

describe('formatApiError Resilience Utility', () => {
  it('formats network connection failure cleanly without leaking internal traces', () => {
    const error = {
      message: 'Network Error',
    };
    const formatted = formatApiError(error);
    expect(formatted).toBe(
      'Cannot connect to server. Please check your network connection or verify the server is running.'
    );
  });

  it('formats request timeout error', () => {
    const error = {
      code: 'ECONNABORTED',
      message: 'timeout of 35000ms exceeded',
    };
    const formatted = formatApiError(error);
    expect(formatted).toBe(
      'Request timed out waiting for the reflection engine. Please try again.'
    );
  });

  it('formats HTTP 401 unauthorized error', () => {
    const error = {
      response: {
        status: 401,
        data: {},
      },
    };
    const formatted = formatApiError(error);
    expect(formatted).toBe('Your session has expired. Please sign in again to continue.');
  });

  it('formats HTTP 404 deleted/missing session error', () => {
    const error = {
      response: {
        status: 404,
        data: {},
      },
    };
    const formatted = formatApiError(error);
    expect(formatted).toBe('The requested reflection was not found or has been removed.');
  });

  it('formats HTTP 422 validation errors with array of field messages', () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'situation'], msg: 'String should have at least 10 characters' },
          ],
        },
      },
    };
    const formatted = formatApiError(error);
    expect(formatted).toBe('String should have at least 10 characters');
  });

  it('formats HTTP 429 rate limit error', () => {
    const error = {
      response: {
        status: 429,
        data: {},
      },
    };
    const formatted = formatApiError(error);
    expect(formatted).toBe(
      'Reflection rate limit or quota exceeded. Please wait a moment and try again.'
    );
  });

  it('formats HTTP 503 AI provider not configured error with backend message', () => {
    const error = {
      response: {
        status: 503,
        data: {
          detail: {
            code: 'AI_PROVIDER_NOT_CONFIGURED',
            message: 'Google Gemini API key is missing. Set GEMINI_API_KEY in your environment.',
          },
        },
      },
    };
    const formatted = formatApiError(error);
    expect(formatted).toBe(
      'Google Gemini API key is missing. Set GEMINI_API_KEY in your environment.'
    );
  });

  it('formats unexpected 500 error gracefully without leaking stack traces or credentials', () => {
    const error = {
      response: {
        status: 500,
        data: {
          traceback: 'Traceback (most recent call last):\n  File "server.py", line 42...',
          secret_key: 'supersecret',
        },
      },
    };
    const formatted = formatApiError(error);
    expect(formatted).toBe(
      'A server error occurred while processing your reflection. Please try again.'
    );
    expect(formatted).not.toContain('Traceback');
    expect(formatted).not.toContain('supersecret');
  });
});
