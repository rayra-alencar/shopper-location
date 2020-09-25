import React, { FunctionComponent, useContext, useReducer } from 'react'
import { helpers } from 'vtex.address-form'

const { addValidation } = helpers

interface LocationContextProps {
  location: AddressFormFields
}

type ReducerActions = {
  type: 'SET_LOCATION'
  args: { address: AddressFormFields }
}

type Dispatch = (action: ReducerActions) => void

const addressWithoutValidation = {
  addressQuery: '',
  neighborhood: '',
  complement: '',
  number: '',
  street: '',
  postalCode: '',
  city: '',
  addressType: 'residential',
  geoCoordinates: [],
  state: '',
  receiverName: '',
  reference: '',
  country: '',
}

const addressWithValidation = addValidation(addressWithoutValidation)

const initialLocationState = {
  location: addressWithValidation,
}

const LocationStateContext = React.createContext<LocationContextProps>(
  initialLocationState
)

const LocationDispatchContext = React.createContext<Dispatch | undefined>(
  undefined
)

function reducer(
  state: LocationContextProps,
  action: ReducerActions
): LocationContextProps {
  switch (action.type) {
    case 'SET_LOCATION':
      return {
        ...state,
        location: action.args.address,
      }

    default:
      return state
  }
}

const LocationContextProvider: FunctionComponent<LocationContextProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialLocationState)

  return (
    <LocationStateContext.Provider value={state}>
      <LocationDispatchContext.Provider value={dispatch}>
        {children}
      </LocationDispatchContext.Provider>
    </LocationStateContext.Provider>
  )
}

function useLocationState() {
  const context = useContext(LocationStateContext)

  if (context === undefined) {
    throw new Error(
      'useLocationState must be used within a LocationStateContextProvider'
    )
  }

  return context
}

function useLocationDispatch() {
  const context = useContext(LocationDispatchContext)

  if (context === undefined) {
    throw new Error(
      'useLocationDispatch must be used within a LocationDispatchContextProvider'
    )
  }

  return context
}

export {
  LocationContextProvider,
  initialLocationState,
  useLocationDispatch,
  useLocationState,
}
