import { IOClients } from '@vtex/api'

import CustomSessionClient from './customSession'

export class Clients extends IOClients {
  public get customSession() {
    return this.getOrSet('customSession', CustomSessionClient)
  }
}
