/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent } from 'react'
import { Input, Dropdown } from 'vtex.styleguide'
import { helpers } from 'vtex.address-form'

import { getListOfOptions, hasOptions } from './fields'

const { injectRules } = helpers

const AddressInput: FunctionComponent<any> = ({
  intl,
  type,
  rules,
  location,
  handleAddressChange,
}) => {
  if (!rules) return null

  const field = rules.fields.find((f: any) => f.name === type)

  if (field.hidden) {
    return null
  }

  const addressData = location[field.name]
  const options = hasOptions(field, location)
    ? getListOfOptions(field, location, rules)
    : undefined

  const errorMessage = () => {
    return intl.formatMessage({
      id: `address-form.error.${addressData.reason}`,
      defaultMessage: intl.formatMessage({
        id: 'address-form.error.generic',
      }),
    })
  }

  const classNames = () => {
    if (field.name === 'city' || field.name === 'state') {
      return 'w-50 mh2'
    }

    if (field.name === 'postalCode' || field.name === 'neighborhood') {
      return ''
    }

    return 'pb5'
  }

  return (
    <div className={classNames()}>
      {options ? (
        <Dropdown
          placeholder={
            !field.required
              ? intl.formatMessage({ id: 'address-form.optional' })
              : null
          }
          label={intl.formatMessage({
            id: `address-form.field.${field.label || field.name}`,
          })}
          options={options}
          value={addressData.value}
          onChange={(e: any) =>
            handleAddressChange({ [field.name]: { value: e.target.value } })
          }
          errorMessage={addressData.valid === false && errorMessage()}
        />
      ) : (
        <Input
          placeholder={
            !field.required
              ? intl.formatMessage({ id: 'address-form.optional' })
              : null
          }
          label={intl.formatMessage({
            id: `address-form.field.${field.label || field.name}`,
          })}
          value={addressData.value}
          onChange={(e: any) =>
            handleAddressChange({ [field.name]: { value: e.target.value } })
          }
          errorMessage={addressData.valid === false && errorMessage()}
        />
      )}
    </div>
  )
}

export default injectRules(AddressInput)
