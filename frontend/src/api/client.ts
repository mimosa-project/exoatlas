const DEFAULT_DEV_API_BASE_URL = 'http://127.0.0.1:8000'

export class ApiError extends Error {
  readonly status: number
  readonly statusText: string
  readonly url: string
  readonly body?: unknown

  constructor(options: {
    message: string
    status: number
    statusText: string
    url: string
    body?: unknown
  }) {
    super(options.message)
    this.name = 'ApiError'
    this.status = options.status
    this.statusText = options.statusText
    this.url = options.url
    this.body = options.body
  }
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }

  if (import.meta.env.DEV) {
    return DEFAULT_DEV_API_BASE_URL
  }

  return ''
}

export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue
    }
    if (typeof value === 'string' && value.length === 0) {
      continue
    }
    search.set(key, String(value))
  }

  const query = search.toString()
  return query.length > 0 ? `?${query}` : ''
}

function readErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const { detail } = body as { detail: unknown }
    if (typeof detail === 'string') {
      return detail
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          item && typeof item === 'object' && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : String(item),
        )
        .join(', ')
    }
  }

  if (typeof body === 'string' && body.length > 0) {
    return body
  }

  return `Request failed with status ${status}`
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return undefined
    }
  }

  try {
    const text = await response.text()
    return text.length > 0 ? text : undefined
  } catch {
    return undefined
  }
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = buildApiUrl(path)

  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    throw new ApiError({
      message:
        error instanceof Error ? error.message : 'Network request failed',
      status: 0,
      statusText: 'Network Error',
      url,
    })
  }

  if (!response.ok) {
    const body = await readResponseBody(response)
    throw new ApiError({
      message: readErrorMessage(body, response.status),
      status: response.status,
      statusText: response.statusText,
      url,
      body,
    })
  }

  return response
}

export async function apiGetJson<T>(
  path: string,
  init?: Omit<RequestInit, 'method' | 'body'>,
): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    method: 'GET',
  })

  try {
    return (await response.json()) as T
  } catch (error) {
    throw new ApiError({
      message:
        error instanceof Error
          ? `Invalid JSON response: ${error.message}`
          : 'Invalid JSON response',
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    })
  }
}
