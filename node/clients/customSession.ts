import { InstanceOptions, IOContext, JanusClient } from '@vtex/api'

export default class CustomSession extends JanusClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, {
      ...options,
      headers: {
        'Proxy-Authorization': context.authToken,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        VtexIdclientAutCookie: context.authToken,
      },
    })
  }

  public getSession = async (token: string): Promise<SessionResponse> => {
    const response = await this.http.getRaw('/api/sessions', {
      headers: {
        'Content-Type': 'application/json',
        Cookie: `vtex_session=${token};`,
      },
      metric: 'session-get',
      params: {
        items: '*',
      },
    })

    return response.data
  }

  public updateSession = (value: string, token: string) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Cookie: `vtex_session=${token};`,
      },
      metric: 'session-update',
    }

    const data = { public: { regionId: { value } } }

    return this.http.patch<any>('/api/sessions', data, config)
  }

  public getRegionId = (
    country: string,
    postalCode: string,
    salesChannel: string
  ): Promise<RegionsResponse[]> => {
    return this.http.get(
      `/api/checkout/pub/regions?country=${country}&postalCode=${postalCode}&sc=${salesChannel}`
    )
  }
}
