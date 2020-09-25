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
export const getParsedAddress = (place: {
  address_components: any[]
  geometry: any
}) => {
  const parsedAddressComponents = place.address_components.reduce(
    (accumulator, address) => {
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

  const address = {
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
    postalCode: parsedAddressComponents.postal_code,
    receiverName: '',
    state: parsedAddressComponents.administrative_area_level_1,
    street: `${
      parsedAddressComponents.street_number
        ? `${parsedAddressComponents.street_number} `
        : ''
    }${parsedAddressComponents.route}`,
    geoCoordinates: latitude && longitude ? [longitude, latitude] : null,
  }

  return address
}
