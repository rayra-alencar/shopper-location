/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent, useEffect, useRef, useState } from 'react'
import { useMutation } from 'react-apollo'
import { WrappedComponentProps, FormattedMessage } from 'react-intl'
import { useModalDispatch } from 'vtex.modal-layout/ModalContext'
import { CountrySelector, helpers, inputs } from 'vtex.address-form'
import { Button, ButtonWithIcon, IconLocation } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useDevice } from 'vtex.device-detector'

import AddressInput from './AddressInput'
import MapContainer from './Map'
import { useLocationState, useLocationDispatch } from './LocationContext'
import { getParsedAddress } from '../helpers/getParsedAddress'
import { countries } from '../messages/countries'
import UPDATE_REGION_ID from '../graphql/UpdateRegionId.graphql'
import updateOrderFormShipping from '../graphql/UpdateOrderFormShipping.graphql'

const { StyleguideInput } = inputs

const {
  addValidation,
  removeValidation,
  injectRules,
  // isValidAddress,
  validateAddress,
} = helpers

let geoTimeout: any = null
let loadingTimeout: any = null

interface AddressProps {
  rules: any
  currentAddress: AddressFormFields
  shipsTo: string[]
  googleMapsKey: string
  orderForm: any
}

const CSS_HANDLES = [
  'changeLocationContainer',
  'changeLocationFormContainer',
  'changeLocationTitle',
  'changeLocationAddressContainer',
  'changeLocationGeoContainer',
  'changeLocationGeoErrorContainer',
  'changeLocationSubmitContainer',
  'changeLocationSubmitButton',
  'changeLocationGeolocationButton',
] as const

const geolocationOptions = {
  enableHighAccuracy: true,
  maximumAge: 30000,
  timeout: 10000,
}

const getGeolocation = async (key: string, address: any) => {
  const query = encodeURIComponent(
    String(
      `${address.number?.value || ''} ${address.street?.value || ''} ${address
        .postalCode?.value || ''} ${address.city?.value || ''} ${address.state
        ?.value || ''}`
    ).trim()
  )

  if (!query) return
  let results: any = []
  let geolocation: any = []

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${key}`
    )

    results = await response.json()
    if (results.results.length) {
      const {
        results: [result],
      } = results

      const {
        geometry: {
          location: { lat, lng },
        },
      } = result

      geolocation = [lng, lat]
    }
  } catch (err) {
    return geolocation
  }

  return geolocation
}

const LocationForm: FunctionComponent<WrappedComponentProps & AddressProps> = ({
  intl,
  rules,
  currentAddress,
  shipsTo,
  orderForm,
  googleMapsKey,
}) => {
  const dispatch = useModalDispatch()
  const { location } = useLocationState()
  const locationDispatch = useLocationDispatch()
  const [countryError, setCountryError] = useState(false)
  const [geoError, setGeoError] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const isMountedRef = useRef(false)
  const [updateAddress] = useMutation(updateOrderFormShipping)
  const handles = useCssHandles(CSS_HANDLES)
  const { isMobile } = useDevice()
  const [regionId, setRegionId] = useState<any | null>(null)
  const [
    sendPostalCode,
    { data: regionIdData, error: errorRegionIdData },
  ] = useMutation(UPDATE_REGION_ID)

  useEffect(() => {
    isMountedRef.current = true
    currentAddress.receiverName = currentAddress.receiverName || { value: ' ' }
    const addressWithValidation = addValidation(currentAddress)

    if (isMountedRef.current) {
      locationDispatch({
        type: 'SET_LOCATION',
        args: {
          address: addressWithValidation,
        },
      })
    }

    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (location.country.value && rules.country) {
      resetAddressRules()
    }
  }, [rules])

  const requestGoogleMapsApi = async (params: {
    lat: number
    long: number
  }) => {
    const { lat, long } = params
    const baseUrl = `https://maps.googleapis.com/maps/api/geocode/json?key=${googleMapsKey}&`
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
  }

  const handleSuccess = async (position: Position) => {
    // call Google Maps API to get location details from returned coordinates
    const { latitude, longitude } = position.coords
    const parsedResponse = await requestGoogleMapsApi({
      lat: latitude,
      long: longitude,
    })

    if (!parsedResponse.results.length) {
      setGeoLoading(false)
      clearTimeout(loadingTimeout)

      return
    }

    // save geolocation to state
    const addressFields = getParsedAddress(parsedResponse.results[0])

    if (!shipsTo.includes(addressFields.country)) {
      setCountryError(true)
      setGeoLoading(false)
      clearTimeout(loadingTimeout)

      return
    }

    const geolocatedAddress = {
      addressQuery: null,
      neighborhood: addressFields.neighborhood || '',
      complement: '',
      number: addressFields.number || '',
      street: addressFields.street || '',
      postalCode: addressFields.postalCode || '',
      city: addressFields.city || '',
      addressType: addressFields.addressType || '',
      geoCoordinates: addressFields.geoCoordinates ?? [],
      state: addressFields.state || '',
      receiverName: location.receiverName.value ?? ' ',
      reference: '',
      country: addressFields.country || '',
    }

    const fieldsWithValidation = addValidation(geolocatedAddress)
    const validatedFields = validateAddress(fieldsWithValidation, rules)

    locationDispatch({
      type: 'SET_LOCATION',
      args: {
        address: validatedFields,
      },
    })
    setGeoLoading(false)
    clearTimeout(loadingTimeout)
  }

  const handleError = () => {
    setGeoError(true)
    setGeoLoading(false)
    clearTimeout(loadingTimeout)
  }

  const handleGeolocation = () => {
    loadingTimeout = setTimeout(() => {
      setGeoLoading(true)
    }, 500)
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      geolocationOptions
    )
  }

  const handleUpdateAddress = () => {
    setLocationLoading(true)
    const newAddress = removeValidation(location)

    updateAddress({
      variables: {
        orderFormId: orderForm.orderFormId,
        address: {
          addressType: 'residential',
          street: newAddress.street,
          city: newAddress.city,
          postalCode: newAddress.postalCode,
          receiverName: newAddress.receiverName,
          state: newAddress.state,
          country: newAddress.country,
          geoCoordinates: newAddress.geoCoordinates,
          neighborhood: newAddress.neighborhood,
          complement: newAddress.complement,
          number: newAddress.number,
        },
      },
    })
      .catch(() => null)
      .then(() => {
        const event = new Event('locationUpdated')

        window.dispatchEvent(event)
        dispatch?.({ type: 'CLOSE_MODAL' })
      })
  }

  function resetAddressRules() {
    const hiddenFields = rules.fields
      .filter(
        (f: any) =>
          f.hidden === true &&
          f.name !== 'postalCode' &&
          f.name !== 'country' &&
          f.name !== 'receiverName'
      )
      .map((i: any) => i.name)

    const addressFields = Object.keys(location)
      .filter((key: any) => !hiddenFields.includes(key))
      .reduce((obj: any, key: any) => {
        obj[key] = location[key]

        return obj
      }, {})

    const address = addValidation(addressFields, rules)

    locationDispatch({
      type: 'SET_LOCATION',
      args: {
        address,
      },
    })
  }

  function handleCountryChange(newAddress: any) {
    const curAddress = location
    const combinedAddress = { ...curAddress, ...newAddress }

    locationDispatch({
      type: 'SET_LOCATION',
      args: {
        address: combinedAddress,
      },
    })
  }

  const getRegionID = async () => {
    const { country, postalCode } = removeValidation(location)

    console.log('getRegionId')

    const regionsAPI = `/api/checkout/pub/regions?country=${country}&postalCode=${postalCode}&sc=${2}`
    const response = await fetch(regionsAPI)
    const data = await response.json()

    console.log('getRegionId Response', data)
    console.log('location', location)
    setRegionId(data)
  }

  function handleAddressChange(newAddress: any) {
    clearTimeout(geoTimeout)
    const curAddress = location
    const combinedAddress = { ...curAddress, ...newAddress }
    const validatedAddress = validateAddress(combinedAddress, rules)

    geoTimeout = setTimeout(() => {
      getGeolocation(googleMapsKey, validatedAddress).then((res: any) => {
        if (res?.length && isMountedRef.current) {
          locationDispatch({
            type: 'SET_LOCATION',
            args: {
              address: {
                ...validatedAddress,
                geoCoordinates: {
                  value: res,
                },
              },
            },
          })
        }
      })
    }, 2500)

    if (isMountedRef.current) {
      locationDispatch({
        type: 'SET_LOCATION',
        args: {
          address: validatedAddress,
        },
      })
    }
  }

  function translateCountries() {
    if (
      location?.country?.value &&
      !shipsTo.includes(location.country.value as string)
    ) {
      shipsTo.push(location.country.value as string)
    }

    return shipsTo.map((code: string) => ({
      label: intl.formatMessage(countries[code as keyof typeof countries]),
      value: code,
    }))
  }

  const shipCountries = translateCountries()

  const updateRegionId = (id: string) => {
    console.log('Update session with regionId:', id)

    return sendPostalCode({
      variables: {
        public: {
          regionId: {
            value: btoa(`SW#${id}`),
          },
        },
      },
    })
  }

  useEffect(() => {
    if (!regionId || !regionId?.[0]?.sellers?.[0]?.id) {
      return
    }

    updateRegionId(regionId[0].sellers[0].id)
  }, [regionId])

  useEffect(() => {
    if (regionIdData) {
      console.log('session response', regionIdData)
      window.location.reload()
    } else {
      console.log('session response error', errorRegionIdData)
    }
  }, [regionIdData])

  return (
    <div
      className={`${handles.changeLocationContainer} w-100`}
      style={!isMobile ? { width: 800 } : {}}
    >
      <div className="flex flex-auto">
        <div className={`${handles.changeLocationFormContainer} pa6 w-100`}>
          <section className={handles.changeLocationGeoContainer}>
            {countryError ? (
              <div
                className={`${handles.changeLocationGeoErrorContainer} mt2 red`}
                style={{ maxWidth: 300 }}
              >
                <FormattedMessage id="store/shopper-location.change-location.error-country" />
              </div>
            ) : geoError ? (
              <div
                className={`${handles.changeLocationGeoErrorContainer} mt2 red`}
                style={{ maxWidth: 300 }}
              >
                <FormattedMessage id="store/shopper-location.change-location.error-permission" />
              </div>
            ) : (
              <div>
                <ButtonWithIcon
                  variation="primary"
                  icon={<IconLocation />}
                  onClick={() => handleGeolocation()}
                  class={handles.changeLocationGeolocationButton}
                  isLoading={geoLoading}
                >
                  <FormattedMessage id="store/shopper-location.change-location.trigger-geolocation" />
                </ButtonWithIcon>
                <ButtonWithIcon
                  variation="primary"
                  icon={<IconLocation />}
                  onClick={() => getRegionID()}
                  class={handles.changeLocationGeolocationButton}
                  isLoading={geoLoading}
                >
                  Update RegionId
                </ButtonWithIcon>
              </div>
            )}
          </section>
          <section className={`${handles.changeLocationAddressContainer} mt7`}>
            <div
              className={` ${
                shipCountries.length === 1 ? 'hide' : ''
              } shopper-location-ship-country`}
            >
              <CountrySelector
                Input={StyleguideInput}
                address={location}
                shipsTo={shipCountries}
                onChangeAddress={(newAddress: AddressFormFields) =>
                  handleCountryChange({
                    country: { value: newAddress.country.value },
                    city: { value: '' },
                    state: { value: '' },
                    neighborhood: { value: '' },
                    postalCode: { value: '' },
                  })
                }
              />
            </div>
            <div className="flex flex-wrap">
              {rules.fields
                .sort((_a: any, b: any) => (b.name === 'postalCode' ? -1 : 1))
                .map((field: any) => {
                  return (
                    <AddressInput
                      key={field.name}
                      intl={intl}
                      field={field}
                      location={location}
                      handleAddressChange={handleAddressChange}
                    />
                  )
                })}
            </div>
          </section>
          <section className={`${handles.changeLocationSubmitContainer} mt7`}>
            <Button
              variation="primary"
              // disabled={!location || !isValidAddress(location, rules).valid}
              onClick={() => handleUpdateAddress()}
              class={handles.changeLocationSubmitButton}
              isLoading={locationLoading}
            >
              <FormattedMessage id="store/shopper-location.change-location.submit" />
            </Button>
          </section>
        </div>
        {!isMobile && (
          <div className="flex-grow-1 relative w-100">
            <MapContainer
              geoCoordinates={location.geoCoordinates.value}
              googleMapsApiKey={googleMapsKey}
              intl={intl}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default injectRules(LocationForm)
