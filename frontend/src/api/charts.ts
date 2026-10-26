import {
  apiGetJson,
  buildQueryString,
  requestInit,
  type RequestOptions,
} from './client'
import type {
  ScatterOrbitRadiusQueryParams,
  ScatterOrbitRadiusResponse,
  SkyMapQueryParams,
  SkyMapResponse,
} from '../types/api'

export async function getOrbitScatter(
  params: ScatterOrbitRadiusQueryParams = {},
  options?: RequestOptions,
): Promise<ScatterOrbitRadiusResponse> {
  return apiGetJson<ScatterOrbitRadiusResponse>(
    `/api/scatter/orbit-radius${buildQueryString(params)}`,
    ...requestInit(options),
  )
}

export async function getSkyMap(
  params: SkyMapQueryParams = {},
  options?: RequestOptions,
): Promise<SkyMapResponse> {
  return apiGetJson<SkyMapResponse>(
    `/api/sky-map${buildQueryString(params)}`,
    ...requestInit(options),
  )
}
