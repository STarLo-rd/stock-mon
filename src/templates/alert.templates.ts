import { AlertTrigger } from '../services/alert-detection.service';

/**
 * Format alert message for Telegram/Email
 */
export function formatAlertMessage(trigger: AlertTrigger): string {
  const timeframeLabels: Record<string, string> = {
    day: 'Previous Day',
    week: '1 Week Ago',
    month: '1 Month Ago',
    year: '1 Year Ago',
  };

  const timeframeLabel = timeframeLabels[trigger.timeframe] ?? trigger.timeframe;
  const dropEmoji = trigger.threshold >= 20 ? '🚨' : trigger.threshold >= 15 ? '⚠️' : '📉';
  const market = trigger.market ?? 'INDIA';
  const marketLabel = market === 'USA' ? 'USA (NYSE/NASDAQ)' : 'India (NSE)';
  const currencySymbol = market === 'USA' ? '$' : '₹';
  const timezone = market === 'USA' ? 'America/New_York' : 'Asia/Kolkata';
  const locale = market === 'USA' ? 'en-US' : 'en-IN';
  
  return `${dropEmoji} <b>Market Crash Alert</b>

Market: <b>${marketLabel}</b>
Symbol: <b>${trigger.symbol}</b>
Drop: <b>${trigger.dropPercentage.toFixed(2)}%</b> (Threshold: ${trigger.threshold}%)
Timeframe: ${timeframeLabel}

Current Price: ${currencySymbol}${trigger.currentPrice.toFixed(2)}
Historical Price: ${currencySymbol}${trigger.historicalPrice.toFixed(2)}

Time: ${new Date().toLocaleString(locale, { timeZone: timezone })}`;
}

/**
 * Format alert subject for email
 */
export function formatAlertSubject(trigger: AlertTrigger): string {
  const severity = trigger.threshold >= 20 ? 'CRITICAL' : trigger.threshold >= 15 ? 'HIGH' : 'MEDIUM';
  const market = trigger.market ?? 'INDIA';
  const marketLabel = market === 'USA' ? 'USA' : 'India';
  return `[${severity}] ${marketLabel} Market Crash Alert: ${trigger.symbol} down ${trigger.dropPercentage.toFixed(2)}%`;
}

/**
 * Format recovery message (from recovery tracking - bottom price)
 */
export function formatRecoveryMessage(
  symbol: string,
  recoveryPercentage: number,
  bottomPrice: number,
  currentPrice: number,
  market: 'INDIA' | 'USA' = 'INDIA'
): string {
  const marketLabel = market === 'USA' ? 'USA (NYSE/NASDAQ)' : 'India (NSE)';
  const currencySymbol = market === 'USA' ? '$' : '₹';
  const timezone = market === 'USA' ? 'America/New_York' : 'Asia/Kolkata';
  const locale = market === 'USA' ? 'en-US' : 'en-IN';

  return `📈 <b>Recovery Alert</b>

Market: <b>${marketLabel}</b>
Symbol: <b>${symbol}</b>
Recovery: <b>${recoveryPercentage.toFixed(2)}%</b> from bottom

Bottom Price: ${currencySymbol}${bottomPrice.toFixed(2)}
Current Price: ${currencySymbol}${currentPrice.toFixed(2)}

Time: ${new Date().toLocaleString(locale, { timeZone: timezone })}`;
}

/**
 * Format new recovery message (5%+ recovery from last alert price)
 */
export function formatNewRecoveryMessage(
  symbol: string,
  recoveryPercentage: number,
  lastAlertPrice: number,
  currentPrice: number,
  market: 'INDIA' | 'USA' = 'INDIA'
): string {
  const marketLabel = market === 'USA' ? 'USA (NYSE/NASDAQ)' : 'India (NSE)';
  const currencySymbol = market === 'USA' ? '$' : '₹';
  const timezone = market === 'USA' ? 'America/New_York' : 'Asia/Kolkata';
  const locale = market === 'USA' ? 'en-US' : 'en-IN';

  return `📈 <b>Market Recovery Alert</b>

Market: <b>${marketLabel}</b>
Symbol: <b>${symbol}</b>
Recovery: <b>+${recoveryPercentage.toFixed(2)}%</b> from last alert

Last Alert Price: ${currencySymbol}${lastAlertPrice.toFixed(2)}
Current Price: ${currencySymbol}${currentPrice.toFixed(2)}
Gain: ${currencySymbol}${(currentPrice - lastAlertPrice).toFixed(2)}

🎉 Market has recovered! Alert tracking cleared.

Time: ${new Date().toLocaleString(locale, { timeZone: timezone })}`;
}

