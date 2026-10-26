import { apiGetJson, buildQueryString } from './client'
import type {
  ScatterOrbitRadiusQueryParams,
  ScatterOrbitRadiusResponse,
} from '../types/api'

export async function getOrbitScatter(
  params: ScatterOrbitRadiusQueryParams = {},
): Promise<ScatterOrbitRadiusResponse> {
  return apiGetJson<ScatterOrbitRadiusResponse>(
    `/api/scatter/orbit-radius${buildQueryString(params)}`,
  )
}
