import React, {
  useEffect,
  useState,
  useCallback,
  FunctionComponent,
} from 'react'
import { useQuery, useMutation } from 'react-apollo'
import { injectIntl, WrappedComponentProps } from 'react-intl'
import { ToastProvider } from 'vtex.styleguide'

import { getParsedAddress } from './helpers/getParsedAddress'
import Address from './graphql/GetOrderForm.graphql'
import Logistics from './graphql/Logistics.graphql'
import UpdateOrderFormShipping from './graphql/UpdateOrderFormShipping.graphql'
import AppSettings from './graphql/AppSettings.graphql'
import RedirectToast from './components/RedirectToast'

const geolocationOptions = {
  enableHighAccuracy: true,
  maximumAge: 30000,
  timeout: 10000,
}

const AddressChallenge: FunctionComponent<WrappedComponentProps> = ({
  children,
  intl,
}) => {
  const [updateAddress] = useMutation(UpdateOrderFormShipping)
  const { loading, data, refetch } = useQuery(Address, { ssr: false })
  const { data: logisticsData } = useQuery(Logistics, { ssr: false })
  const { data: appSettingsData } = useQuery<AppSettingsData>(AppSettings, {
    variables: {
      version: process.env.VTEX_APP_VERSION,
    },
    ssr: false,
  })

  const [renderChildren, setRenderChildren] = useState(false)

  const requestGoogleMapsApi = useCallback(
    async (params: { lat: number; long: number }) => {
      const { lat, long } = params
      const baseUrl = `https://maps.googleapis.com/maps/api/geocode/json?key=${logisticsData.logistics.googleMapsKey}&`
      let suffix = ''

      if (lat && long) {
        suffix = `latlng=${lat},${long}`
      }

      try {
        const response = await fetch(baseUrl + suffix)

        return await response.json()
      } catch (err) {
        return { results: [] }
      }
    },
    [logisticsData?.logistics?.googleMapsKey]
  )

  const handleSuccess = useCallback(
    async (position: Position) => {
      // call Google Maps API to get location details from returned coordinates
      const { latitude, longitude } = position.coords
      const parsedResponse = await requestGoogleMapsApi({
        lat: latitude,
        long: longitude,
      })

      if (!parsedResponse.results.length) return

      // save geolocation to orderForm
      const addressFields = getParsedAddress(parsedResponse.results[0])

      addressFields.number = ''
      addressFields.street = ''

      const { orderFormId } = data.orderForm

      await updateAddress({
        variables: {
          orderFormId,
          address: addressFields,
        },
      })
        .catch(() => null)
        .then(() => {
          const event = new Event('locationUpdated')

          window.dispatchEvent(event)
        })
    },
    [data?.orderForm, requestGoogleMapsApi, updateAddress]
  )

  const handleError = useCallback(() => {
    const settings =
      appSettingsData &&
      (JSON.parse(appSettingsData.appSettings.message) as Settings)

    if (!settings?.geolocationApiKey) return
    // get geolocation from user IP
    fetch(
      `https://ip-geolocation.whoisxmlapi.com/api/v1?apiKey=${settings.geolocationApiKey}`
    )
      .then(res => res.json())
      .then(async res => {
        const { location } = res

        if (!location.lat || !location.lng) return
        const parsedResponse = await requestGoogleMapsApi({
          lat: location.lat,
          long: location.lng,
        })

        if (!parsedResponse.results.length) return

        // const { shipsTo = [] } = logisticsData?.logistics
        const addressFields = getParsedAddress(parsedResponse.results[0])

        addressFields.number = ''
        addressFields.street = ''
        // if (!shipsTo.includes(addressFields.country)) {
        //   addressFields = fallbackAddress
        //   addressFields.country = shipsTo[0]
        // }
        const { orderFormId } = data.orderForm

        await updateAddress({
          variables: {
            orderFormId,
            address: addressFields,
          },
        })
          .catch(() => null)
          .then(() => {
            const event = new Event('locationUpdated')

            window.dispatchEvent(event)
          })
      })
  }, [appSettingsData, data?.orderForm, requestGoogleMapsApi, updateAddress])

  useEffect(() => {
    const handleLocationUpdated = () => refetch()

    window.addEventListener('locationUpdated', handleLocationUpdated)

    return () => {
      window.removeEventListener('locationUpdated', handleLocationUpdated)
    }
  }, [refetch])

  useEffect(() => {
    if (loading || !data?.orderForm || !logisticsData?.logistics?.googleMapsKey)
      return
    setRenderChildren(true)
    if (data.orderForm.shippingData) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      geolocationOptions
    )
  }, [loading, data, logisticsData, handleError, handleSuccess])

  if (!renderChildren) return null

  return (
    <ToastProvider positioning="window">
      {children}
      <RedirectToast
        intl={intl}
        orderForm={data.orderForm}
        appSettings={appSettingsData?.appSettings}
      />
    </ToastProvider>
  )
}

export default injectIntl(AddressChallenge)
