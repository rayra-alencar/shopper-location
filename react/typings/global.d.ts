declare global {
  interface AddressFormFields {
    [key: string]: {
      value: null | string | number | number[]
      valid?: boolean
      geolocationAutoCompleted?: boolean
      postalCodeAutoCompleted?: boolean
    }
  }

  interface AppSettingsData {
    appSettings: SettingsData
  }

  interface SettingsData {
    message: string
  }
  interface Settings {
    geolocationApiKey: string
    redirects: Redirect[]
    automaticRedirect: boolean
  }
  interface Redirect {
    country: string
    url: string
  }
}
export {}
