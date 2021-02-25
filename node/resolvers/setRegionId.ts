/* eslint-disable @typescript-eslint/no-explicit-any */
export const setRegionId = async (
  _: unknown,
  args: SetRegionArgs,
  ctx: Context
) => {
  const {
    clients: { customSession },
    cookies,
  } = ctx

  const sessionCookie = cookies.get('vtex_session')

  if (!sessionCookie) {
    return { updated: false }
  }

  const session = customSession.getSession(sessionCookie)

  const { country, postalCode, salesChannel } = args
  const regionRequest = customSession.getRegionId(
    country,
    postalCode,
    salesChannel
  )

  const [
    {
      namespaces: {
        public: { regionId },
      },
    },
    [{ id: updatedRegionId }],
  ] = await Promise.all([session, regionRequest])

  if (!regionId || regionId.value === updatedRegionId) {
    return { updated: false }
  }

  await customSession.updateSession(updatedRegionId, sessionCookie)

  return { updated: true }
}
