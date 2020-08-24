import React, { useEffect, FunctionComponent, Fragment } from 'react'
import { path, compose } from 'ramda'
import { useQuery, useMutation } from 'react-apollo'
import address from './graphql/GetOrderForm.graphql'
import updateOrderFormShipping from './graphql/UpdateOrderFormShipping.graphql'

const hasShippingAddress = compose(Boolean, path(['shippingData', 'address']))

const geolocationOptions = {
  enableHighAccuracy: true,
  maximumAge: 30000,
  timeout: 10000,
}

const getCountryISO3 = require('country-iso-2-to-3')

const AddressChallenge: FunctionComponent = ({ children }) => {
  const [updateAddress] = useMutation(updateOrderFormShipping)
  const { loading, data } = useQuery(address, { ssr: false })

  const handleSuccess = async (position: Position) => {
    // save geolocation to orderForm
    const addressFields = {
      addressType: '',
      city: '',
      complement: '',
      neighborhood: '',
      number: '',
      postalCode: '',
      street: '',
      state: '',
      receiverName: '',
      country: '',
      geoCoordinates: [position.coords.latitude, position.coords.longitude],
    }
    const { orderFormId } = data.orderForm
    await updateAddress({
      variables: {
        orderFormId,
        address: addressFields,
      },
    }).catch(() => null)
  }

  const handleError = () => {
    // get geolocation from user IP
    fetch(
      'https://ip-geolocation.whoisxmlapi.com/api/v1?apiKey=at_L8gZdFWXLnrgfsBzlnQtt8lNJkc7k'
    )
      .then(res => res.json())
      .then(async res => {
        const { location } = res
        const addressFields = {
          addressType: '',
          city: location.city,
          complement: '',
          neighborhood: '',
          number: '',
          postalCode: location.postalCode,
          street: '',
          state: location.region,
          receiverName: '',
          country: getCountryISO3(location.country),
          geoCoordinates: [location.lat, location.lng],
        }
        const { orderFormId } = data.orderForm
        await updateAddress({
          variables: {
            orderFormId,
            address: addressFields,
          },
        }).catch(() => null)
      })
  }

  useEffect(() => {
    if (loading || !data?.orderForm || hasShippingAddress(data.orderForm))
      return
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      geolocationOptions
    )
  }, [loading, data])

  return <Fragment>{children}</Fragment>
}

export default AddressChallenge
