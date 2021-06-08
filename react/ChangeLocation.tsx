import React, { FunctionComponent } from 'react'

import ChangeLocationContainer from './components/ChangeLocationContainer'
import {
  LocationContextProvider,
  initialLocationState,
} from './components/LocationContext'

const ChangeLocation: FunctionComponent = (props: any) => {
  return (
    <LocationContextProvider {...initialLocationState}>
      <ChangeLocationContainer {...props}/>
    </LocationContextProvider>
  )
}

export default ChangeLocation
