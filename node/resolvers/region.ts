export const updateRegionId = async (_: any, args: any, ctx: Context) => {
  const {
    clients: { customSession },
  } = ctx

  console.log('gql call')
  const {
    data,
    headers: { 'set-cookie': setCookie },
  }: any = await customSession.updateRegionId(args)

  ctx.set(
    'Set-Cookie',
    setCookie.map((cookie: any) =>
      cookie.replace(`; domain=${ctx.vtex.host}`, '')
    )
  )

  return data
}
