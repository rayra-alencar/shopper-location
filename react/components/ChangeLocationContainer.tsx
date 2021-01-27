import React, { FunctionComponent } from 'react'
import { useQuery } from 'react-apollo'
import { injectIntl, WrappedComponentProps } from 'react-intl'
import { AddressRules } from 'vtex.address-form'
import { Spinner } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'

import address from '../graphql/GetOrderForm.graphql'
import Logistics from '../graphql/Logistics.graphql'
import LocationForm from './LocationForm'
import { useLocationState } from './LocationContext'

const CSS_HANDLES = ['changeLocationContainer'] as const

const ChangeLocation: FunctionComponent<WrappedComponentProps> = ({ intl }) => {
  const { loading, data } = useQuery(address, { ssr: false })
  const { data: logisticsData } = useQuery(Logistics, { ssr: false })
  const { location } = useLocationState()
  const handles = useCssHandles(CSS_HANDLES)

  if (loading)
    return (
      <div
        className={handles.changeLocationContainer}
        style={{ minWidth: 800 }}
      >
        <Spinner />
      </div>
    )
  if ((!loading && !data) || !logisticsData) return null

  const { address: queriedAddress } = data.orderForm?.shippingData || {}

  const currentAddress = {
    addressQuery: '',
    neighborhood: queriedAddress?.neighborhood || '',
    complement: queriedAddress?.complement || '',
    number: queriedAddress?.number || '',
    street: queriedAddress?.street || '',
    postalCode: queriedAddress?.postalCode || '',
    city: queriedAddress?.city || '',
    addressType: queriedAddress?.addressType || 'residential',
    geoCoordinates: queriedAddress?.geoCoordinates || [],
    state: queriedAddress?.state || '',
    receiverName: queriedAddress?.receiverName || '',
    reference: queriedAddress?.reference || '',
    country: queriedAddress?.country || '',
  }

  return (
    <AddressRules
      country={
        location.country?.value ||
        data.orderForm?.shippingData?.address?.country ||
        logisticsData.logistics?.shipsTo[0]
      }
      shouldUseIOFetching
      useGeolocation={false}
    >
      <LocationForm
        orderForm={data.orderForm || null}
        currentAddress={currentAddress}
        shipsTo={logisticsData.logistics?.shipsTo || []}
        googleMapsKey={logisticsData.logistics?.googleMapsKey || ''}
        intl={intl}
      />
    </AddressRules>
  )
}

export default injectIntl(ChangeLocation)
