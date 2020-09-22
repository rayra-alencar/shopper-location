import React, { FunctionComponent } from 'react'
import ChangeLocationContainer from './components/ChangeLocationContainer'
import {
  LocationContextProvider,
  initialLocationState,
} from './components/LocationContext'

const ChangeLocation: FunctionComponent = () => {
  return (
    <LocationContextProvider {...initialLocationState}>
      <ChangeLocationContainer />
    </LocationContextProvider>
  )
}

export default ChangeLocation
