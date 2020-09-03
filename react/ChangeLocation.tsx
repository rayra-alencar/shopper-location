import React, { FunctionComponent } from 'react'
import { useQuery } from 'react-apollo'
import { injectIntl, WrappedComponentProps } from 'react-intl'
import { AddressRules } from 'vtex.address-form'
import { Spinner } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import address from './graphql/GetOrderForm.graphql'
import LocationForm from './LocationForm'

const CSS_HANDLES = ['changeLocationContainer'] as const

const ChangeLocationContainer: FunctionComponent<WrappedComponentProps> = ({
  intl,
}) => {
  const { loading, data } = useQuery(address, { ssr: false })
  const handles = useCssHandles(CSS_HANDLES)

  if (loading)
    return (
      <div className={handles.changeLocationContainer}>
        <Spinner />
      </div>
    )
  if (!loading && !data) return null

  const { address: queriedAddress } = data.orderForm?.shippingData || {}

  const currentAddress = {
    neighborhood: queriedAddress.neighborhood || '',
    complement: queriedAddress.complement || '',
    number: queriedAddress.number || '',
    street: queriedAddress.street || '',
    postalCode: queriedAddress.postalCode || '',
    city: queriedAddress.city || '',
    addressType: queriedAddress.addressType || '',
    geoCoordinates: queriedAddress.geoCoordinates || [],
    state: queriedAddress.state || '',
    receiverName: queriedAddress.receiverName || '',
    reference: queriedAddress.reference || '',
    country: queriedAddress.country || '',
  }

  return (
    <AddressRules
      country={data.orderForm?.shippingData?.address?.country}
      shouldUseIOFetching
      useGeolocation={false}
    >
      <LocationForm
        orderFormId={data.orderForm?.orderFormId}
        currentAddress={currentAddress}
        intl={intl}
      />
    </AddressRules>
  )
}

export default injectIntl(ChangeLocationContainer)
