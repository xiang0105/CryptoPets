import { getAddress, isAddress } from 'ethers'
import { invalidRequest } from './errors.js'

interface UintOptions {
  positive?: boolean
  max?: bigint
}

export function readBody(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw invalidRequest('Request body must be an object')
  }

  return value as Record<string, unknown>
}

export function readString(body: Record<string, unknown>, name: string) {
  const value = body[name]

  if (typeof value !== 'string' || !value.trim()) {
    throw invalidRequest(`${name} must be a non-empty string`)
  }

  return value.trim()
}

export function readOptionalString(body: Record<string, unknown>, name: string) {
  const value = body[name]

  if (value === undefined || value === null) {
    return ''
  }

  if (typeof value !== 'string') {
    throw invalidRequest(`${name} must be a string`)
  }

  return value.trim()
}

export function readAddress(value: unknown, name: string) {
  if (typeof value !== 'string' || !isAddress(value)) {
    throw invalidRequest(`${name} must be a valid address`)
  }

  return getAddress(value)
}

export function readBoolean(body: Record<string, unknown>, name: string) {
  const value = body[name]

  if (typeof value !== 'boolean') {
    throw invalidRequest(`${name} must be a boolean`)
  }

  return value
}

export function readUint(value: unknown, name: string, options: UintOptions = {}) {
  let rawValue = ''

  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw invalidRequest(`${name} must be a safe non-negative integer`)
    }
    rawValue = String(value)
  } else if (typeof value === 'string') {
    rawValue = value.trim()
  } else {
    throw invalidRequest(`${name} must be a decimal integer string`)
  }

  if (!/^[0-9]+$/.test(rawValue)) {
    throw invalidRequest(`${name} must be a decimal integer string`)
  }

  const parsed = BigInt(rawValue)

  if (options.positive && parsed === 0n) {
    throw invalidRequest(`${name} must be greater than zero`)
  }

  if (options.max !== undefined && parsed > options.max) {
    throw invalidRequest(`${name} is too large`)
  }

  return parsed
}

export function readUintFromBody(body: Record<string, unknown>, name: string, options: UintOptions = {}) {
  if (!(name in body)) {
    throw invalidRequest(`${name} is required`)
  }

  return readUint(body[name], name, options)
}

export function readUintParam(value: unknown, name: string, options: UintOptions = {}) {
  return readUint(value, name, options)
}

export function readUintListFromQuery(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw invalidRequest(`${name} query is required`)
  }

  return value.split(',').map((item, index) => readUint(item, `${name}[${index}]`))
}

export function readUintArray(body: Record<string, unknown>, name: string) {
  const value = body[name]

  if (!Array.isArray(value) || value.length === 0) {
    throw invalidRequest(`${name} must be a non-empty array`)
  }

  return value.map((item, index) => readUint(item, `${name}[${index}]`))
}

export function readHexData(body: Record<string, unknown>, name: string) {
  const value = readOptionalString(body, name)

  if (!value) {
    return '0x'
  }

  if (!/^0x([0-9a-fA-F]{2})*$/.test(value)) {
    throw invalidRequest(`${name} must be hex bytes`)
  }

  return value
}

export function uintToString(value: bigint) {
  return value.toString()
}
