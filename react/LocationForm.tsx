import React, { useState, FunctionComponent } from 'react'
import { useQuery, useMutation } from 'react-apollo'
import { WrappedComponentProps, FormattedMessage } from 'react-intl'
import { useModal } from 'vtex.modal/ModalContext'
import {
  AddressContainer,
  AddressForm as AddressFields,
  inputs,
  helpers,
  PostalCodeGetter,
} from 'vtex.address-form'
import { Button, ButtonWithIcon, IconLocation } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { getParsedAddress } from './helpers/getParsedAddress'
import updateOrderFormShipping from './graphql/UpdateOrderFormShipping.graphql'
import getGoogleMapsKey from './graphql/GetGoogleMapsKey.graphql'

const { StyleguideInput } = inputs
const {
  addValidation,
  removeValidation,
  injectRules,
  isValidAddress,
  validateAddress,
} = helpers

interface AddressProps {
  rules: any
  currentAddress: AddressFormFields
  orderFormId: string
}

const CSS_HANDLES = [
  'changeLocationContainer',
  'changeLocationTitle',
  'changeLocationAddressContainer',
  'changeLocationGeoContainer',
  'changeLocationSubmitContainer',
  'changeLocationSubmitButton',
  'changeLocationGeolocationButton',
] as const

const geolocationOptions = {
  enableHighAccuracy: true,
  maximumAge: 30000,
  timeout: 10000,
}

const LocationForm: FunctionComponent<WrappedComponentProps & AddressProps> = ({
  intl,
  rules,
  currentAddress,
  orderFormId,
}) => {
  const { closeModal } = useModal()
  const { data } = useQuery(getGoogleMapsKey, { ssr: false })
  const [updateAddress] = useMutation(updateOrderFormShipping)
  const handles = useCssHandles(CSS_HANDLES)

  const addressWithValidation = addValidation({
    addressQuery: null,
    ...currentAddress,
  })
  const [storedAddress, setStoredAddress] = useState(addressWithValidation)

  const requestGoogleMapsApi = async (params: {
    lat: number
    long: number
  }) => {
    const { lat, long } = params
    const baseUrl = `https://maps.googleapis.com/maps/api/geocode/json?key=${data.logistics.googleMapsKey}&`
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
    if (!parsedResponse.results.length) return

    // save geolocation to state
    const addressFields = getParsedAddress(parsedResponse.results[0])
    const geolocatedAddress = {
      addressQuery: null,
      neighborhood: addressFields.neighborhood || '',
      complement: '',
      number: addressFields.number || '',
      street: addressFields.street || '',
      postalCode: addressFields.postalCode || '',
      city: addressFields.city || '',
      addressType: addressFields.addressType || '',
      geoCoordinates: addressFields.geoCoordinates || [],
      state: addressFields.state || '',
      receiverName: storedAddress.receiverName.value || '',
      reference: '',
      country: addressFields.country || '',
    }
    const fieldsWithValidation = addValidation(geolocatedAddress)
    const validatedFields = validateAddress(fieldsWithValidation, rules)
    setStoredAddress(validatedFields)
  }

  const handleError = () => {
    return
  }

  const handleGeolocation = () => {
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      geolocationOptions
    )
  }

  const handleUpdateAddress = () => {
    let newAddress = removeValidation(storedAddress)
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
        const result = window.dispatchEvent(event)
        console.log(result)
        closeModal && closeModal()
      })
  }

  function handleAddressChange(newAddress: AddressFormFields) {
    const curAddress = storedAddress
    const combinedAddress = { ...curAddress, ...newAddress }
    const validatedAddress = validateAddress(combinedAddress, rules)
    setStoredAddress(validatedAddress)
  }

  return (
    <div className={handles.changeLocationContainer}>
      <h2 className={`${handles.changeLocationTitle} heading-2`}>
        <FormattedMessage id="store/shopper-location.change-location.title" />
      </h2>
      <section className={handles.changeLocationGeoContainer}>
        <ButtonWithIcon
          variation="primary"
          icon={<IconLocation />}
          onClick={() => handleGeolocation()}
          class={handles.changeLocationGeolocationButton}
        >
          <FormattedMessage id="store/shopper-location.change-location.trigger-geolocation" />
        </ButtonWithIcon>
      </section>
      <section className={`${handles.changeLocationAddressContainer} mt7`}>
        <AddressContainer
          address={storedAddress}
          Input={StyleguideInput}
          rules={rules}
          onChangeAddress={(newAddress: AddressFormFields) =>
            handleAddressChange(newAddress)
          }
          autoCompletePostalCode={false}
        >
          <AddressFields
            address={storedAddress}
            Input={StyleguideInput}
            omitAutoCompletedFields={false}
            omitPostalCodeFields={true}
            onChangeAddress={(newAddress: AddressFormFields) =>
              handleAddressChange(newAddress)
            }
            notApplicableLabel={intl.formatMessage({
              id: 'store/shopper-location.change-location.addressNotApplicable',
            })}
          />
          <PostalCodeGetter
            address={storedAddress}
            Input={StyleguideInput}
            onChangeAddress={(newAddress: AddressFormFields) =>
              handleAddressChange(newAddress)
            }
          />
        </AddressContainer>
      </section>
      <section className={`${handles.changeLocationSubmitContainer} mt7`}>
        <Button
          variation="primary"
          disabled={
            !storedAddress || !isValidAddress(storedAddress, rules).valid
          }
          onClick={() => handleUpdateAddress()}
          class={handles.changeLocationSubmitButton}
        >
          <FormattedMessage id="store/shopper-location.change-location.submit" />
        </Button>
      </section>
    </div>
  )
}

export default injectRules(LocationForm)
