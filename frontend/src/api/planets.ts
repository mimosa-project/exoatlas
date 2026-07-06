import { apiGetJson, buildQueryString } from './client'
import type {
  PlanetDetail,
  PlanetListQueryParams,
  PlanetListResponse,
} from '../types/api'

export async function getPlanets(
  params: PlanetListQueryParams = {},
): Promise<PlanetListResponse> {
  return apiGetJson<PlanetListResponse>(
    `/api/planets${buildQueryString(params)}`,
  )
}

export async function getPlanetDetail(planetName: string): Promise<PlanetDetail> {
  return apiGetJson<PlanetDetail>(
    `/api/planets/${encodeURIComponent(planetName)}`,
  )
}
