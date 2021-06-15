/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent, useEffect, useRef, useState } from 'react'
import { useMutation } from 'react-apollo'
import { WrappedComponentProps, FormattedMessage } from 'react-intl'
import { useRuntime } from 'vtex.render-runtime'
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
import SET_REGION_ID from '../graphql/SetRegionId.graphql'
import updateOrderFormShipping from '../graphql/UpdateOrderFormShipping.graphql'

const { StyleguideInput } = inputs

const {
  addValidation,
  removeValidation,
  injectRules,
  isValidAddress,
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
  autofill?: string[]
  autocomplete?: boolean
  postalCode?: string
  hideFields?: string[]
  notRequired?: string[]
}

const CSS_HANDLES = [
  'changeLocationContainer',
  'changeLocationFormContainer',
  'changeLocationTitle',
  'changeLocationAddressContainer',
  'changeLocationGeoContainer',
  'changeLocationMapContainer',
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

const getFulllocation = async (key: string, address: any) => {
  const query = encodeURIComponent(
    String(`${address.postalCode?.value || ''}`).trim()
  )

  if (!query) return
  let results: any = []
  let result: any = {}

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${key}`
    )

    results = await response.json()
    const {
      results: [result],
    } = results

    return result
  } catch (err) {
    return result
  }
}

const LocationForm: FunctionComponent<WrappedComponentProps &
  AddressProps> = props => {
  const {
    intl,
    rules,
    currentAddress,
    shipsTo,
    orderForm,
    googleMapsKey,
    autofill,
    autocomplete,
    postalCode,
    hideFields,
    notRequired,
  } = props

  const dispatch: any = useModalDispatch()
  let { location } = useLocationState()

  const locationDispatch = useLocationDispatch()
  const [countryError, setCountryError] = useState(false)
  const [geoError, setGeoError] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const isMountedRef = useRef(false)
  const handles = useCssHandles(CSS_HANDLES)
  const { isMobile } = useDevice()
  const { culture } = useRuntime()

  const [
    updateAddress,
    { called: updateAddressCalled, loading: updateAddressLoading },
  ] = useMutation(updateOrderFormShipping)

  const [
    setRegionId,
    {
      called: setRegionIdCalled,
      loading: setRegionIdLoading,
      data: regionData,
    },
  ] = useMutation(SET_REGION_ID)

  const mutationsPending = () => {
    return (
      !updateAddressCalled ||
      !setRegionIdCalled ||
      updateAddressLoading ||
      setRegionIdLoading
    )
  }

  if (location?.country?.value === '') {
    location.country.value = culture.country
  }

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
  const fieldsNotRequired = ['complement', 'receiverName', 'reference']
  if (notRequired && notRequired.length) {
    notRequired.forEach((field: string) => {
      fieldsNotRequired.push(field)
    })
  }
  let customRules = rules
  customRules.fields = customRules.fields
    .map((field: any) => {
      return {
        ...field,
        hidden:
          hideFields && hideFields.indexOf(field.name) !== -1
            ? true
            : field.hidden && field.hidden === true,
      }
    })
    .map((field: any) => {
      return {
        ...field,
        required:
          fieldsNotRequired.indexOf(field.name) !== -1
            ? false
            : field.hidden === true
            ? false
            : true,
      }
    })

  useEffect(() => {
    if (mutationsPending()) {
      return
    }

    if (regionData?.setRegionId.updated) {
      window.location.reload()
    } else {
      const event = new Event('locationUpdated')

      window.dispatchEvent(event)
      dispatch?.({ type: 'CLOSE_MODAL' })
    }
  }, [
    updateAddressCalled,
    setRegionIdCalled,
    updateAddressLoading,
    setRegionIdLoading,
  ])

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
    const addressFields = getParsedAddress(parsedResponse.results[0], autofill)

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
    const validatedFields = validateAddress(fieldsWithValidation, customRules)
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

  const updateRegionID = async () => {
    const { country, postalCode } = removeValidation(location)
    const { salesChannel } = orderForm

    setRegionId({
      variables: {
        country,
        postalCode,
        salesChannel,
      },
    })
  }

  const handleUpdateAddress = () => {
    setLocationLoading(true)
    const newAddress = removeValidation(location)

    updateRegionID()
    updateAddress({
      variables: {
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
          isDisposable: true,
        },
      },
    })
  }

  function resetAddressRules() {
    const hiddenFields = customRules.fields
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

    const address = addValidation(addressFields, customRules)
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
    resetAddressRules()
    locationDispatch({
      type: 'SET_LOCATION',
      args: {
        address: combinedAddress,
      },
    })
  }

  function handleAddressChange(newAddress: any) {
    clearTimeout(geoTimeout)
    const curAddress = location
    const combinedAddress = { ...curAddress, ...newAddress }
    const validatedAddress = validateAddress(combinedAddress, customRules)

    geoTimeout = setTimeout(() => {
      if (
        newAddress?.postalCode?.value &&
        postalCode === 'first' &&
        autocomplete === true
      ) {
        getFulllocation(googleMapsKey, validatedAddress).then((res: any) => {
          const responseAddress = addValidation(
            getParsedAddress(res, autofill),
            customRules
          )
          const address = validateAddress(responseAddress, customRules)

          if (res && isMountedRef.current) {
            locationDispatch({
              type: 'SET_LOCATION',
              args: {
                address,
              },
            })
          }
        })
      } else {
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
      }
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

    return shipsTo.map((code: string) => {
      const countryCode = countries[code as keyof typeof countries]
      return {
        label: countryCode ? intl.formatMessage(countryCode) : code,
        value: code,
      }
    })
  }

  const shipCountries = translateCountries()

  const sortFields = (_a: any, b: any) => {
    if (!props.postalCode || props?.postalCode?.toLowerCase() !== 'first') {
      return b.name === 'postalCode' ? -1 : 1
    }
    return 0
  }

  const fields = customRules.fields.sort(sortFields)

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
              <>
                <ButtonWithIcon
                  variation="primary"
                  icon={<IconLocation />}
                  onClick={() => handleGeolocation()}
                  class={handles.changeLocationGeolocationButton}
                  isLoading={geoLoading}
                >
                  <FormattedMessage id="store/shopper-location.change-location.trigger-geolocation" />
                </ButtonWithIcon>
              </>
            )}
          </section>
          <section className={`${handles.changeLocationAddressContainer} mt7`}>
            <div
              className={` ${
                shipCountries.length === 1 ? 'dn' : ''
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
            <div className="flex flex-wrap fields-container">
              {fields.map((field: any) => {
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
              disabled={
                !location || !isValidAddress(location, customRules).valid
              }
              onClick={() => handleUpdateAddress()}
              class={handles.changeLocationSubmitButton}
              isLoading={locationLoading}
            >
              <FormattedMessage id="store/shopper-location.change-location.submit" />
            </Button>
          </section>
        </div>
        {!isMobile && (
          <div
            className={`flex-grow-1 relative w-100 ${handles.changeLocationMapContainer}`}
          >
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
