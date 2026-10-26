import {
  apiGetJson,
  buildQueryString,
  requestInit,
  type RequestOptions,
} from './client'
import type {
  DiscoveryMethodsQueryParams,
  DiscoveryMethodsResponse,
  DiscoveryTimelineQueryParams,
  DiscoveryTimelineResponse,
} from '../types/api'

export async function getDiscoveryMethods(
  params: DiscoveryMethodsQueryParams = {},
): Promise<DiscoveryMethodsResponse> {
  return apiGetJson<DiscoveryMethodsResponse>(
    `/api/discovery-methods${buildQueryString(params)}`,
  )
}

export async function getDiscoveryTimeline(
  params: DiscoveryTimelineQueryParams = {},
  options?: RequestOptions,
): Promise<DiscoveryTimelineResponse> {
  return apiGetJson<DiscoveryTimelineResponse>(
    `/api/discoveries/timeline${buildQueryString(params)}`,
    ...requestInit(options),
  )
}
