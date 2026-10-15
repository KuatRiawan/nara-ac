import { describe, it, expect } from 'vitest';
import { getErrorMessage, getAxiosErrorMessage } from '../utils/errors';

describe('getErrorMessage', () => {
  it('extracts message from axios error response', () => {
    const error = { response: { data: { error: { message: 'Invalid credentials' } } } };
    expect(getErrorMessage(error)).toBe('Invalid credentials');
  });

  it('extracts message from api.js interceptor error', () => {
    const error = { error: { message: 'Network error' } };
    expect(getErrorMessage(error)).toBe('Network error');
  });

  it('extracts message from regular Error object', () => {
    const error = new Error('Something went wrong');
    expect(getErrorMessage(error)).toBe('Something went wrong');
  });

  it('handles string errors', () => {
    expect(getErrorMessage('Plain string error')).toBe('Plain string error');
  });

  it('handles response data as string', () => {
    const error = { response: { data: 'Server error occurred' } };
    expect(getErrorMessage(error)).toBe('Server error occurred');
  });

  it('returns default message for unknown error shapes', () => {
    expect(getErrorMessage(null)).toBe('Terjadi kesalahan');
    expect(getErrorMessage(undefined)).toBe('Terjadi kesalahan');
    expect(getErrorMessage({})).toBe('Terjadi kesalahan');
    expect(getErrorMessage(null, 'Custom default')).toBe('Custom default');
  });

  it('prioritizes response.data.error.message over other fields', () => {
    const error = {
      response: { data: { error: { message: 'Priority message' } } },
      error: { message: 'Lower priority' },
      message: 'Lowest priority',
    };
    expect(getErrorMessage(error)).toBe('Priority message');
  });
});

describe('getAxiosErrorMessage', () => {
  it('extracts message from axios error response data.error.message', () => {
    const error = { response: { data: { error: { message: 'Validation failed' } } } };
    expect(getAxiosErrorMessage(error)).toBe('Validation failed');
  });

  it('extracts message from axios error response data.message', () => {
    const error = { response: { data: { message: 'Not found' } } };
    expect(getAxiosErrorMessage(error)).toBe('Not found');
  });

  it('falls back to statusText', () => {
    const error = { response: { statusText: 'Internal Server Error' } };
    expect(getAxiosErrorMessage(error)).toBe('Internal Server Error');
  });

  it('falls back to error.message', () => {
    const error = { message: 'Network Error' };
    expect(getAxiosErrorMessage(error)).toBe('Network Error');
  });

  it('returns default message when nothing matches', () => {
    expect(getAxiosErrorMessage({})).toBe('Terjadi kesalahan jaringan');
    expect(getAxiosErrorMessage({}, 'Custom')).toBe('Custom');
  });
});
