declare module 'vtex.store-resources/Queries' {
  import { DocumentNode } from 'graphql'

  export const orderForm: DocumentNode
  export const address
}

declare module 'vtex.store-resources/Mutations' {
  export const updateOrderFormShipping
}
