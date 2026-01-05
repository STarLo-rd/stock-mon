/**
 * Market hours configuration for India and USA markets
 */
const MARKET_HOURS = {
  INDIA: {
    timezone: 'Asia/Kolkata',
    openHour: 9,
    openMinute: 15,
    closeHour: 15,
    closeMinute: 30,
  },
  USA: {
    timezone: 'America/New_York', // EST/EDT
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
  },
} as const;

/**
 * Check if the market is currently open
 * @param market - Market type (INDIA or USA)
 * @returns true if market is open, false otherwise
 */
export function isMarketOpen(market: 'INDIA' | 'USA' = 'INDIA'): boolean {
  const marketConfig = MARKET_HOURS[market];
  const now = new Date();
  const marketDate = new Date(now.toLocaleString('en-US', { timeZone: marketConfig.timezone }));

  const currentHour = marketDate.getHours();
  const currentMinute = marketDate.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const openTime = marketConfig.openHour * 60 + marketConfig.openMinute;
  const closeTime = marketConfig.closeHour * 60 + marketConfig.closeMinute;

  // Check if it's a weekday (Monday = 1, Sunday = 0)
  const dayOfWeek = marketDate.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  return isWeekday && currentTime >= openTime && currentTime <= closeTime;
}

/**
 * Get the next market open time
 * @param market - Market type (INDIA or USA)
 * @returns Date object for next market open
 */
export function getNextMarketOpen(market: 'INDIA' | 'USA' = 'INDIA'): Date {
  const marketConfig = MARKET_HOURS[market];
  const now = new Date();
  const marketDate = new Date(now.toLocaleString('en-US', { timeZone: marketConfig.timezone }));

  const nextOpen = new Date(marketDate);
  nextOpen.setHours(marketConfig.openHour, marketConfig.openMinute, 0, 0);

  // If market already opened today but closed, set to tomorrow
  const currentTime = marketDate.getHours() * 60 + marketDate.getMinutes();
  const closeTime = marketConfig.closeHour * 60 + marketConfig.closeMinute;

  if (currentTime > closeTime || nextOpen < marketDate) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }

  // Skip weekends
  while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }

  return nextOpen;
}

/**
 * Check if both India and USA markets are open
 * Currently returns false as only INDIA market is supported
 * @returns false (INDIA-only support)
 */
export function areBothMarketsOpen(): boolean {
  return false; // Only INDIA market is supported in this phase
}

/**
 * Get market hours configuration for a specific market
 * @param market - Market type (INDIA or USA)
 * @returns Market hours configuration
 */
export function getMarketHours(market: 'INDIA' | 'USA' = 'INDIA') {
  return MARKET_HOURS[market];
}
