import React, { useEffect, useRef, FunctionComponent } from 'react'
import { components } from 'vtex.address-form'
import markerIconBlue from './assets/icons/marker.svg'

interface MapContainerProps {
  googleMapsApiKey: string
  geoCoordinates: string[]
  intl: any
}

interface MapProps {
  geoCoordinates: string[]
  googleMaps: any
}

const mapStyles = {
  height: '100%',
  width: '100%',
  position: 'absolute' as 'absolute',
  top: 0,
  zIndex: 0,
}
let map: any = null
let marker: any = null
let last: string = ''
const { GoogleMapsContainer } = components

const MapContainer: FunctionComponent<MapContainerProps> = ({
  intl,
  googleMapsApiKey,
  geoCoordinates = [],
}) => {
  return (
    <GoogleMapsContainer apiKey={googleMapsApiKey} locale={intl.locale}>
      {({ loading, googleMaps }: { loading: boolean; googleMaps: any }) =>
        loading || !geoCoordinates.length ? null : (
          <Map googleMaps={googleMaps} geoCoordinates={geoCoordinates} />
        )
      }
    </GoogleMapsContainer>
  )
}

const Map: FunctionComponent<MapProps> = ({ googleMaps, geoCoordinates }) => {
  const getLocation = (geoCoordinates: string[]) => {
    const [lng, lat] = geoCoordinates
    const location = new googleMaps.LatLng(lat, lng)
    return location
  }

  const mapDiv = useRef(null)
  const mapOptions = {
    zoom: 12,
    mapTypeControl: false,
    zoomControl: true,
    fullscreenControl: false,
    streetViewControl: false,
    color: '#00ff00',
    clickableIcons: false,
    zoomControlOptions: {
      position: googleMaps.ControlPosition.CENTER_RIGHT,
      style: googleMaps.ZoomControlStyle.SMALL,
    },
    styles: [
      {
        featureType: 'poi',
        stylers: [{ visibility: 'off' }],
      },
    ],
  }

  const setMap = () => {
    const location = getLocation(geoCoordinates)
    last = geoCoordinates.join('')
    map = new googleMaps.Map(mapDiv.current, {
      center: location,
      ...mapOptions,
    })

    const markerOptions = {
      position: location,
      draggable: false,
      map,
      icon: markerIconBlue,
    }

    marker = new googleMaps.Marker(markerOptions)

    marker.setPosition(location)
  }

  useEffect(() => {
    if (!mapDiv.current) return
    setMap()
  }, [location, mapDiv])

  if (!!marker && last !== geoCoordinates.join('')) {
    setMap()
  }

  if (!googleMaps || !geoCoordinates.length) return null

  return <div id="map-canvas" style={mapStyles} ref={mapDiv} />
}

export default MapContainer
