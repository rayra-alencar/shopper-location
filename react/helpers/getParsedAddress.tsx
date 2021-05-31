/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

const getCountryISO3 = require('country-iso-2-to-3')

/**
 * The place object returned from Google Maps API has some extra informations about the address that won't be used when sending
 * to orderform. So, this function will reduce nested address information into a simpler consumable object.
 *
 * @param {Object} place The place object returned from Google Maps API
 * @returns {Object} The reduced address data with only necessary fields/information
 */
export const getParsedAddress = (place: any, autofill: any = null) => {
  const parsedAddressComponents = place.address_components.reduce(
    (accumulator: any, address:any) => {
      const parsedItem = address.types.reduce(
        (typeAccumulator: any, type: any) => ({
          ...typeAccumulator,
          [type]: address.short_name,
        }),
        {}
      )

      return { ...accumulator, ...parsedItem }
    },
    {}
  )

  const { lat, lng } = place.geometry?.location ?? {}
  // lat and lng may come as a function or a double
  const latitude = typeof lat === 'function' ? lat() : lat
  const longitude = typeof lng === 'function' ? lng() : lng

  const street = parsedAddressComponents.route
    ? `${
        parsedAddressComponents.street_number
          ? `${parsedAddressComponents.street_number} `
          : ''
      }${parsedAddressComponents.route}`
    : ''

  const fullAddress: any = {
    addressType: 'residential',
    city:
      parsedAddressComponents.locality ||
      parsedAddressComponents.administrative_area_level_3 ||
      parsedAddressComponents.administrative_area_level_2,
    // complement: '',
    /* Google Maps API returns Alpha-2 ISO codes, but checkout API requires Alpha-3 */
    country: getCountryISO3(parsedAddressComponents.country),
    neighborhood: parsedAddressComponents.sublocality_level_1,
    number: parsedAddressComponents.street_number || '',
    postalCode: parsedAddressComponents.postal_code || '',
    receiverName: '',
    state: parsedAddressComponents.administrative_area_level_1,
    street,
    geoCoordinates: latitude && longitude ? [longitude, latitude] : null,
  }

  const basicAddress: any = {
    addressType: fullAddress.addressType,
    country: fullAddress.country, 
    postalCode: fullAddress.postalCode,
    geoCoordinates: fullAddress.geoCoordinates,
    receiverName: fullAddress.receiverName,
  }
  const validKeys = ["city", "country", "neighborhood", "number", "postalCode", "state", "street"]
  
  if (autofill) {
    autofill.forEach((field: string) => {
      if (validKeys.indexOf(field) !== -1 && fullAddress[field]) {
        basicAddress[field] = fullAddress[field]
      }
    })
  }

  return autofill ? basicAddress : fullAddress
}
