import { Alert } from '../services/api';

/**
 * Export alerts to CSV format
 */
export function exportToCSV(alerts: Alert[]): string {
  if (alerts.length === 0) {
    return '';
  }

  // CSV Header
  const headers = ['Symbol', 'Market', 'Drop %', 'Threshold', 'Timeframe', 'Price', 'Historical Price', 'Date', 'Critical'];
  const csvRows = [headers.join(',')];

  // CSV Rows
  for (const alert of alerts) {
    const row = [
      alert.symbol,
      alert.market || 'INDIA',
      parseFloat(alert.dropPercentage).toFixed(2),
      alert.threshold.toString(),
      alert.timeframe,
      parseFloat(alert.price).toFixed(2),
      parseFloat(alert.historicalPrice).toFixed(2),
      new Date(alert.timestamp).toISOString(),
      alert.critical ? 'Yes' : 'No',
    ];
    csvRows.push(row.map((cell) => `"${cell}"`).join(','));
  }

  return csvRows.join('\n');
}

/**
 * Export alerts to JSON format
 */
export function exportToJSON(alerts: Alert[]): string {
  return JSON.stringify(alerts, null, 2);
}

/**
 * Download file to user's computer
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export alerts as CSV file
 */
export function exportAlertsToCSV(alerts: Alert[], filename?: string): void {
  const csv = exportToCSV(alerts);
  const defaultFilename = `alerts_${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename || defaultFilename, 'text/csv');
}

/**
 * Export alerts as JSON file
 */
export function exportAlertsToJSON(alerts: Alert[], filename?: string): void {
  const json = exportToJSON(alerts);
  const defaultFilename = `alerts_${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, filename || defaultFilename, 'application/json');
}

