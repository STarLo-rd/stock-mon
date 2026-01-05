import React, { createContext, useContext, useEffect, useState } from "react"

type Market = "INDIA"

type MarketProviderProps = {
  children: React.ReactNode
  defaultMarket?: Market
  storageKey?: string
}

type MarketProviderState = {
  market: Market
  setMarket: (market: Market) => void
}

const initialState: MarketProviderState = {
  market: "INDIA",
  setMarket: () => null,
}

const MarketProviderContext = createContext<MarketProviderState>(initialState)

export function MarketProvider({
  children,
  defaultMarket = "INDIA",
  storageKey = "market-monitor-market",
  ...props
}: MarketProviderProps) {
  const [market, setMarket] = useState<Market>(
    () => (localStorage.getItem(storageKey) as Market) || defaultMarket
  )

  const value = {
    market,
    setMarket: (market: Market) => {
      localStorage.setItem(storageKey, market)
      setMarket(market)
    },
  }

  return (
    <MarketProviderContext.Provider {...props} value={value}>
      {children}
    </MarketProviderContext.Provider>
  )
}

export const useMarket = () => {
  const context = useContext(MarketProviderContext)

  if (context === undefined)
    throw new Error("useMarket must be used within a MarketProvider")

  return context
}
