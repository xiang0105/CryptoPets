const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl && envUrl.trim() !== '') {
    return envUrl
  }

  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol } = window.location
    const isLocal = hostname === 'localhost' ||
                    hostname === '127.0.0.1' ||
                    /^192\.168\.\d+\.\d+$/.test(hostname) ||
                    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
                    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)

    if (isLocal) {
      return `${protocol}//${hostname}:3400`
    }
  }

  return 'https://cryptopets-api.onrender.com'
}

const API_BASE_URL = getApiBaseUrl()
const AUTH_TOKEN_KEY = 'cryptopets.authToken'

export function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('NETWORK_ERROR')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'API_ERROR' }))
    throw new Error(typeof body.error === 'string' ? body.error : 'API_ERROR')
  }

  return response.json() as Promise<T>
}
