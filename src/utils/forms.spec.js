import { describe, expect, it } from 'vitest'
import { getErrorMessage, optionalNumber } from './forms'

describe('form helpers', () => {
  it('returns validation messages from Laravel error responses', () => {
    const error = {
      response: {
        data: {
          errors: {
            email: ['El email ya existe.'],
            password: ['La contraseña es obligatoria.'],
          },
        },
      },
    }

    expect(getErrorMessage(error, 'Error genérico')).toBe(
      'El email ya existe. La contraseña es obligatoria.',
    )
  })

  it('keeps optional numeric values nullable', () => {
    expect(optionalNumber('')).toBeNull()
    expect(optionalNumber(null)).toBeNull()
    expect(optionalNumber('125.50')).toBe(125.5)
  })
})
