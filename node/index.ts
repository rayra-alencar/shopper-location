import {
  ServiceContext,
  RecorderState,
  ParamsContext,
  Service,
} from '@vtex/api'

import { Clients } from './clients'
import { setRegionId } from './resolvers/setRegionId'

const MEDIUM_TIMEOUT_MS = 2 * 1000

declare global {
  type Context = ServiceContext<Clients>

  interface State extends RecorderState {
    code: number
  }
}

export default new Service<Clients, RecorderState, ParamsContext>({
  clients: {
    implementation: Clients,
    options: {
      default: {
        retries: 2,
        timeout: MEDIUM_TIMEOUT_MS,
      },
    },
  },
  graphql: {
    resolvers: {
      Mutation: {
        setRegionId,
      },
    },
  },
})
