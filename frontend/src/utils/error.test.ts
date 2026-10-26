import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { toErrorMessage } from './error'

describe('toErrorMessage (state polish AC 1)', () => {
  it('returns the message of an ApiError', () => {
    const error = new ApiError({
      message: 'Planet not found',
      status: 404,
      statusText: 'Not Found',
      url: '/api/planets/x',
    })

    expect(toErrorMessage(error)).toBe('Planet not found')
  })

  it('returns the message of an Error, including subclasses and empty messages', () => {
    expect(toErrorMessage(new Error('Network down'))).toBe('Network down')
    expect(toErrorMessage(new TypeError('Failed to fetch'))).toBe('Failed to fetch')
    expect(toErrorMessage(new Error(''))).toBe('')
  })

  it.each([
    ['a string', 'boom'],
    ['null', null],
    ['undefined', undefined],
    ['a plain object with message', { message: 'not an Error' }],
    ['a number', 42],
  ])('returns "Request failed" for %s', (_label, value) => {
    expect(toErrorMessage(value)).toBe('Request failed')
  })
})
