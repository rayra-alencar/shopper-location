/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent, useEffect, useRef, useState } from 'react'
import { useMutation } from 'react-apollo'
import { WrappedComponentProps, FormattedMessage } from 'react-intl'
import { useModalDispatch } from 'vtex.modal-layout/ModalContext'
import {
  CountrySelector,
  helpers,
  inputs
} from 'vtex.address-form'
import { Button, ButtonWithIcon, IconLocation, Input, Dropdown } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useDevice } from 'vtex.device-detector'

import MapContainer from './Map'
import { useLocationState, useLocationDispatch } from './LocationContext'
import { getParsedAddress } from '../helpers/getParsedAddress'
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
  orderFormId: string
}

const CSS_HANDLES = [
  'changeLocationContainer',
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
  orderFormId,
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


  useEffect(() => {
    isMountedRef.current = true
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
      receiverName: location.receiverName.value ?? '',
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
        orderFormId,
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

  function handleAddressChange(newAddress: AddressFormFields) {
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
      label: intl.formatMessage({
        id: `store/shopper-location.countries.${code}`,
      }),
      value: code,
    }))
  }
  const shipCountries = translateCountries()
  
  const _states_options = [
    { value: 'op1', label: 'op1' },
    { value: 'op2', label: 'op2' }
  ]

  return (
    <div
      className={`${handles.changeLocationContainer} w-100 nb6-ns`}
    >
      <div className="nh8-ns nv6-ns flex flex-auto">
        <div className="pa6">
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
              <ButtonWithIcon
                variation="primary"
                icon={<IconLocation />}
                onClick={() => handleGeolocation()}
                class={handles.changeLocationGeolocationButton}
                isLoading={geoLoading}
              >
                <FormattedMessage id="store/shopper-location.change-location.trigger-geolocation" />
              </ButtonWithIcon>
            )}
          </section>
          <section className={`${handles.changeLocationAddressContainer} mt7`}>
            
            <div 
              className={` ${shipCountries.length==1 ? "hide" : ""} shopper-location-ship-country`}
            >
              <CountrySelector
                Input={StyleguideInput}
                address={location}
                shipsTo={shipCountries}
                onChangeAddress=""
              />
            </div>
            <div className="pb5">
              <Input
                placeholder={intl.formatMessage({
                  id: 'store/shopper-location.change-location.street-placeholder',
                })}
                label={intl.formatMessage({
                  id: 'store/shopper-location.change-location.street',
                })}
                onChange={(newAddress: AddressFormFields) =>
                  handleAddressChange(newAddress)
                }
              />
            </div>
            <div className="pb5">
              <Input
                placeholder={intl.formatMessage({
                  id: 'store/shopper-location.change-location.apartment',
                })}
                label={intl.formatMessage({
                  id: 'store/shopper-location.change-location.apartment',
                })}
              />
            </div>
            <div className="pb5 flex nh2">
              <div
                className={`w-50 mh2`}
              >
                <Input
                  placeholder="City"
                  label="City"
                />
              </div>
              <div
                className={`w-50 mh2`}
              >
                <Dropdown
                  label="State"
                  options={_states_options}
                />
              </div>
            </div>
            <div className="">
              <Input
                placeholder=""
                label="Postal Code"
              />
            </div>
          </section>
          <section className={`${handles.changeLocationSubmitContainer} mt7`}>
            <Button
              variation="primary"
              disabled={!location || !isValidAddress(location, rules).valid}
              onClick={() => handleUpdateAddress()}
              class={handles.changeLocationSubmitButton}
              isLoading={locationLoading}
            >
              <FormattedMessage id="store/shopper-location.change-location.submit" />
            </Button>
          </section>
        </div>
        {!isMobile && (
          <div className="flex-grow-1 relative">
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
