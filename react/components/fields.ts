/* eslint-disable @typescript-eslint/no-explicit-any */
import find from 'lodash/find'
import map from 'lodash/map'
import filter from 'lodash/filter'
import reduce from 'lodash/reduce'
import last from 'lodash/last'
import deburr from 'lodash/deburr'

const POSTAL_CODE = 'POSTAL_CODE'
const ONE_LEVEL = 'ONE_LEVEL'
const TWO_LEVELS = 'TWO_LEVELS'
const THREE_LEVELS = 'THREE_LEVELS'

const cleanStr = (str: string) => (str ? deburr(str.toLowerCase()) : str)

export function getField(fieldName: any, rules: any) {
  return find(rules.fields, ({ name }) => name === fieldName)
}

function hasOption(value: any, options: any) {
  const cleanField = cleanStr(value)
  const cleanOptions = map(options, str => ({
    clean: cleanStr(str),
    value: str,
  }))

  const option = find(cleanOptions, _option => _option.clean === cleanField)

  if (option) {
    return option.value
  }

  return false
}

export function hasOptions(field: any, address: any) {
  const hasValueOptions = address?.[field.name]?.valueOptions

  return !!(
    field.options ||
    field.optionsPairs ||
    field.optionsMap ||
    hasValueOptions
  )
}

function getFieldValue(field: any) {
  return typeof field === 'object' ? field.value : field
}

export function normalizeOptions(options: any) {
  return reduce(
    options,
    (acc: any, option, key) => {
      acc[cleanStr(key)] = option

      return acc
    },
    {}
  )
}

function fixOptions(options: any, fieldOptions: any) {
  return reduce(
    options,
    (acc, option) => {
      const cleanOption = hasOption(option, fieldOptions)

      return cleanOption ? acc.concat(cleanOption) : acc
    },
    []
  )
}

export function getListOfOptions(field: any, address: any, rules: any) {
  // Has options provided by Postal Code
  const postalCodeOptions = address?.[field.name]?.valueOptions

  if (postalCodeOptions) {
    if (field.options && !field.basedOn) {
      return map(fixOptions(postalCodeOptions, field.options), toValueAndLabel)
    }

    if (field.optionsMap && field.basedOn && field.level === 2) {
      return map(
        fixOptions(postalCodeOptions, getSecondLevelOptions(field, address)),
        toValueAndLabel
      )
    }

    if (field.optionsMap && field.basedOn && field.level === 3) {
      return map(
        fixOptions(
          postalCodeOptions,
          getThirdLevelOptions(field, address, rules)
        ),
        toValueAndLabel
      )
    }

    return map(address[field.name].valueOptions, toValueAndLabel)
  }

  if (field.options) {
    return map(field.options, toValueAndLabel)
  }

  if (field.optionsPairs) {
    return field.optionsPairs
  }

  if (field.optionsMap && field.basedOn && field.level === 2) {
    return map(getSecondLevelOptions(field, address), toValueAndLabel)
  }

  if (field.optionsMap && field.basedOn && field.level === 3) {
    return map(getThirdLevelOptions(field, address, rules), toValueAndLabel)
  }

  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Invalid rule set')
  } else {
    return []
  }
}

function getSecondLevelOptions(field: any, address: any) {
  const basedOn = getFieldValue(address[field.basedOn])
  const cleanBasedOn = cleanStr(basedOn)
  const normalizedOptionsMap = normalizeOptions(field.optionsMap) as any

  if (cleanBasedOn && normalizedOptionsMap[cleanBasedOn]) {
    return normalizedOptionsMap[cleanBasedOn]
  }

  return []
}

function getThirdLevelOptions(field: any, address: any, rules: any) {
  const secondLevelField = getField(field.basedOn, rules)
  const firstLevelField = getField(secondLevelField.basedOn, rules)

  const secondLevelValue = getFieldValue(address[secondLevelField.name])
  const firstLevelValue = getFieldValue(address[firstLevelField.name])

  const normalizedOptionsMap = normalizeOptions(field.optionsMap) as any
  const cleanFirstLevelValue = cleanStr(firstLevelValue)

  if (
    cleanFirstLevelValue &&
    secondLevelValue &&
    normalizedOptionsMap[cleanFirstLevelValue] &&
    normalizedOptionsMap[cleanFirstLevelValue][secondLevelValue]
  ) {
    return normalizedOptionsMap[cleanFirstLevelValue][secondLevelValue]
  }

  return []
}

function toValueAndLabel(option: any) {
  return { value: option, label: option }
}

export function getDependentFields(fieldName: any, rules: any) {
  let dependentFields = [] as any

  if (fieldAffectsPostalCode(fieldName, rules)) {
    dependentFields = [...dependentFields, 'postalCode']
  }

  const dependentField = getFieldBasedOn(fieldName, rules)

  if (dependentField) {
    dependentFields = [...dependentFields, dependentField]

    const secondLevelField = getFieldBasedOn(dependentField, rules)

    if (secondLevelField) {
      dependentFields = [...dependentFields, secondLevelField]
    }
  }

  return dependentFields
}

function getFieldBasedOn(fieldName: any, rules: any) {
  const field = find(rules.fields, ({ basedOn }) => basedOn === fieldName)

  return field ? field.name : null
}

export function filterPostalCodeFields(rules: any) {
  switch (rules.postalCodeFrom) {
    case THREE_LEVELS:
      return filter(
        rules.fields,
        ({ name }) => rules.postalCodeLevels.indexOf(name) === -1
      )

    case TWO_LEVELS:
      return filter(
        rules.fields,
        ({ name }) => rules.postalCodeLevels.indexOf(name) === -1
      )

    case ONE_LEVEL:
      return filter(
        rules.fields,
        ({ name }) => rules.postalCodeLevels[0] !== name
      )

    default:
    case POSTAL_CODE:
      return filter(rules.fields, ({ name }) => name !== 'postalCode')
  }
}

function fieldAffectsPostalCode(fieldName: any, rules: any) {
  return (
    rules.postalCodeLevels && rules.postalCodeLevels.indexOf(fieldName) !== -1
  )
}

export function isDefiningPostalCodeField(fieldName: any, rules: any) {
  const lastLevelField = last(rules.postalCodeLevels)

  return fieldName === lastLevelField
}

export function filterAutoCompletedFields(rules: any, address: any) {
  return reduce(
    rules.fields,
    (fields, field) => {
      const addressField = address[field.name]

      if (
        addressField &&
        !addressField.valueOptions &&
        (addressField.postalCodeAutoCompleted ||
          addressField.geolocationAutoCompleted)
      ) {
        return fields
      }

      return fields.concat(field)
    },
    []
  )
}
