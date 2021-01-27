
import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

export default class CustomSession extends ExternalClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(`http://${context.account}.vtexcommercestable.com.br`, context, {
        ...options,
        headers: {
          'Proxy-Authorization': context.authToken,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Vtex-Use-Https': 'true',
          VtexIdclientAutCookie: context.authToken,
        },
      })
    }

    public updateRegionId = (body: any) => {
      console.log(this.context)
        return this.http.postRaw(
          `/api/sessions`, body
        )
      }
}