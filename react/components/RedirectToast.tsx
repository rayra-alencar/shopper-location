import React, { FunctionComponent, useState } from 'react'
import { injectIntl, WrappedComponentProps } from 'react-intl'
import { ToastConsumer } from 'vtex.styleguide'
import { countries } from '../messages/countries'
interface RedirectToastProps {
  orderForm: any
  appSettings?: SettingsData
}

const RedirectToast: FunctionComponent<RedirectToastProps &
  WrappedComponentProps> = ({ intl, orderForm, appSettings }) => {
  const [redirectTo, setRedirectTo] = useState<string | null>(null)
  const hasCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('VtexShopperLocation'))

  const setCookie = () =>
    (document.cookie = `VtexShopperLocation=1;path=/;max-age=7890000`)

  if (!orderForm.shippingData?.address || !appSettings || hasCookie) {
    return null
  }

  const settings = JSON.parse(appSettings.message) as Settings
  const { redirects } = settings

  if (!redirects) return null

  if (!redirectTo) {
    const countryRedirect = redirects.find(
      redirect => redirect.country === orderForm.shippingData.address.country
    )

    if (
      !countryRedirect?.url ||
      window.location.href.includes(countryRedirect.url)
    ) {
      return null
    }

    if (settings.automaticRedirect) {
      setCookie()
      window.location.href = countryRedirect.url

      return null
    }

    setRedirectTo(countryRedirect.url)
  }

  const toastMessage = () => {
    const country = intl.formatMessage(
      countries[orderForm.shippingData?.address?.country ?? orderForm.storePreferencesData.countryCode]
    )

    return intl.formatMessage(
      {
        id: 'store/shopper-location.redirect-toast.message',
      },
      {
        country,
      }
    )
  }

  return (
    <ToastConsumer>
      {(toast: any) => {
        toast.showToast({
          message: toastMessage(),
          horizontalPosition: 'right',
          duration: 20000,
          action: {
            label: 'Switch',
            href: redirectTo,
            target: '_self',
          },
        })

        setRedirectTo(null)
        setCookie()
      }}
    </ToastConsumer>
  )
}

export default injectIntl(RedirectToast)
