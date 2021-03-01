interface RegionsResponse {
  id: string
  sellers: Sellers[]
}

interface Sellers {
  id: string
  name: string
  logo: string
}

interface SessionResponse {
  id: string
  namespaces: {
    public: {
      regionId?: { value: string }
    }
  }
}

interface SetRegionArgs {
  country: string
  postalCode: string
  salesChannel: string
}
