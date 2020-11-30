/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent } from 'react'
import { Input, Dropdown } from 'vtex.styleguide'
import { helpers } from 'vtex.address-form'
import { useCssHandles } from 'vtex.css-handles'

import { getListOfOptions, hasOptions } from './fields'
import { labels } from '../messages/labels'

const { injectRules } = helpers

const CSS_HANDLES = ['addressInputContainer'] as const

const AddressInput: FunctionComponent<any> = ({
  intl,
  field,
  rules,
  location,
  handleAddressChange,
}) => {
  const handles = useCssHandles(CSS_HANDLES)

  if (!rules || (rules.country && location.country.value !== rules.country))
    return null

  const { name, label, hidden, required } = field

  if (hidden || name === 'receiverName' || name === 'complement') {
    return null
  }

  const addressData = location[name]

  if (!addressData) return null

  const options = hasOptions(field, location)
    ? getListOfOptions(field, location, rules)
    : undefined

  const addClasses = () => {
    if (name === 'city' || name === 'state') {
      return 'w-50 ph1 pb5'
    }

    if (name === 'postalCode') {
      return 'w-100'
    }

    return 'pb5 w-100'
  }

  const getPlaceholder = () => {
    if (required) {
      return null
    }

    return intl.formatMessage({
      id: 'store/shopper-location.change-location.optional',
    })
  }

  const getLabel = () => {
    return intl.formatMessage(
      label
        ? labels[label as keyof typeof labels]
        : labels[name as keyof typeof labels]
    )
  }

  const getErrorMessage = () => {
    if (addressData.valid !== false) {
      return null
    }

    const key = addressData.reason as keyof typeof labels

    if (key === 'ERROR_EMPTY_FIELD' || key === 'ERROR_POSTAL_CODE') {
      return intl.formatMessage(labels[key])
    }

    return intl.formatMessage(labels.generic)
  }

  return (
    <div className={`${handles.addressInputContainer} ${addClasses()}`}>
      {options ? (
        <Dropdown
          placeholder={getPlaceholder()}
          label={getLabel()}
          options={options}
          value={addressData.value}
          onChange={(e: any) =>
            handleAddressChange({ [name]: { value: e.target.value } })
          }
          errorMessage={getErrorMessage()}
        />
      ) : (
        <Input
          placeholder={getPlaceholder()}
          label={getLabel()}
          value={addressData.value}
          onChange={(e: any) =>
            handleAddressChange({ [name]: { value: e.target.value } })
          }
          errorMessage={getErrorMessage()}
        />
      )}
    </div>
  )
}

export default injectRules(AddressInput)
