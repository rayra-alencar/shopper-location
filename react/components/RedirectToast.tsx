import React, { FunctionComponent, useState } from 'react'
import { ToastConsumer } from 'vtex.styleguide'

interface RedirectToastProps {
  intl: any
  orderForm: any
  appSettings?: SettingsData
}

const RedirectToast: FunctionComponent<RedirectToastProps> = ({
  intl,
  orderForm,
  appSettings,
}) => {
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
    const country = intl.formatMessage({
      id: `store/shopper-location.countries.${orderForm.shippingData.address.country}`,
    })

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

export default RedirectToast
