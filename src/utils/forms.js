import * as yup from 'yup'

export const getErrorMessage = (error, fallback) => {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message ?? fallback
}

export const optionalNumber = (value) =>
  value !== '' && value !== null && value !== undefined ? Number(value) : null

export const nullableNumber = (message) =>
  yup
    .number()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .typeError(message)
    .nullable()
    .min(0, message)

export const requiredNumber = (requiredMessage, typeMessage, minMessage = typeMessage) =>
  yup
    .number()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError(typeMessage)
    .required(requiredMessage)
    .min(0, minMessage)
