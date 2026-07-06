import { apiGetJson } from './client'
import type { HealthResponse } from '../types/api'

export async function getHealth(): Promise<HealthResponse> {
  return apiGetJson<HealthResponse>('/health')
}
