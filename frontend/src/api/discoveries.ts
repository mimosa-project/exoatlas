import { apiGetJson, buildQueryString } from './client'
import type {
  DiscoveryMethodsQueryParams,
  DiscoveryMethodsResponse,
} from '../types/api'

export async function getDiscoveryMethods(
  params: DiscoveryMethodsQueryParams = {},
): Promise<DiscoveryMethodsResponse> {
  return apiGetJson<DiscoveryMethodsResponse>(
    `/api/discovery-methods${buildQueryString(params)}`,
  )
}
