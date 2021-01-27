import { IOClients } from '@vtex/api'

import CustomSessionClient from './session'

export class Clients extends IOClients {
  public get customSession() {
    return this.getOrSet('customSession', CustomSessionClient)
  }
}
