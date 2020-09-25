import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  FunctionComponent,
  useCallback,
} from 'react'
import { components } from 'vtex.address-form'

import markerIconBlue from '../assets/icons/marker.svg'

interface MapContainerProps {
  intl: any
  googleMapsApiKey: string
  geoCoordinates: any
}

interface MapProps {
  geoCoordinates: number[]
  googleMaps: any
}

const mapStyles = {
  height: '100%',
  width: '100%',
  position: 'absolute' as const,
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
}: MapContainerProps) => {
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
  const getLocation = useCallback(
    (coordinates: number[]) => {
      const [lng, lat] = coordinates
      const location = new googleMaps.LatLng(lat, lng)

      return location
    },
    [googleMaps.LatLng]
  )

  const mapDiv = useRef(null)
  const mapOptions = useMemo(() => {
    return {
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
  }, [
    googleMaps.ControlPosition.CENTER_RIGHT,
    googleMaps.ZoomControlStyle.SMALL,
  ])

  const setMap = useCallback(() => {
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
  }, [
    geoCoordinates,
    getLocation,
    googleMaps.Map,
    googleMaps.Marker,
    mapOptions,
  ])

  useEffect(() => {
    if (!mapDiv.current || last === geoCoordinates.join('')) return
    setLast(geoCoordinates.join(''))
    setMap()
  }, [mapDiv, geoCoordinates, last, setMap])

  if (!googleMaps || !geoCoordinates.length) return null

  return <div id="map-canvas" style={mapStyles} ref={mapDiv} />
}

export default MapContainer
