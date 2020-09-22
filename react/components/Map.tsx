import React, { useEffect, useState, useRef, FunctionComponent } from 'react'
import { components } from 'vtex.address-form'
import markerIconBlue from '../assets/icons/marker.svg'

interface MapContainerProps {
  googleMapsApiKey: string
  geoCoordinates: any
  intl: any
}

interface MapProps {
  geoCoordinates: number[]
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
  const [last, setLast] = useState('')
  const getLocation = (geoCoordinates: number[]) => {
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
    if (!mapDiv.current || last === geoCoordinates.join('')) return
    setLast(geoCoordinates.join(''))
    setMap()
  }, [mapDiv, geoCoordinates])

  if (!googleMaps || !geoCoordinates.length) return null

  return <div id="map-canvas" style={mapStyles} ref={mapDiv} />
}

export default MapContainer
