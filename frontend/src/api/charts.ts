import { apiGetJson, buildQueryString } from './client'
import type {
  ScatterOrbitRadiusQueryParams,
  ScatterOrbitRadiusResponse,
  SkyMapQueryParams,
  SkyMapResponse,
} from '../types/api'

export async function getOrbitScatter(
  params: ScatterOrbitRadiusQueryParams = {},
): Promise<ScatterOrbitRadiusResponse> {
  return apiGetJson<ScatterOrbitRadiusResponse>(
    `/api/scatter/orbit-radius${buildQueryString(params)}`,
  )
}

export async function getSkyMap(
  params: SkyMapQueryParams = {},
): Promise<SkyMapResponse> {
  return apiGetJson<SkyMapResponse>(`/api/sky-map${buildQueryString(params)}`)
}
