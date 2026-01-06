/**
 * Subscription Plan Business Rules
 * These define access rules for each plan - stored in code, not database
 */

export enum SubscriptionPlanName {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  PRO = 'PRO',
}

export enum StockAccess {
  NIFTY50 = 'NIFTY50',
  MIDCAP150 = 'MIDCAP150',
  SMALLCAP = 'SMALLCAP',
  ALL = 'ALL',
}

export enum MutualFundAccess {
  TOP_15 = 'TOP_15',
  TOP_30 = 'TOP_30',
  ALL = 'ALL',
}

/**
 * Subscription plan business rules
 * Maps plan names to their access rules
 */
export const SUBSCRIPTION_PLAN_RULES = {
  [SubscriptionPlanName.FREE]: {
    stockAccess: [StockAccess.NIFTY50],
    mutualFundAccess: MutualFundAccess.TOP_15,
    indicesAccess: ['TOP_5'], // Top 5 indices
  },
  [SubscriptionPlanName.PREMIUM]: {
    stockAccess: [StockAccess.NIFTY50, StockAccess.MIDCAP150],
    mutualFundAccess: MutualFundAccess.TOP_30,
    indicesAccess: ['ALL'], // All indices
  },
  [SubscriptionPlanName.PRO]: {
    stockAccess: [StockAccess.NIFTY50, StockAccess.MIDCAP150, StockAccess.SMALLCAP, StockAccess.ALL],
    mutualFundAccess: MutualFundAccess.ALL,
    indicesAccess: ['ALL'],
  },
} as const;

/**
 * Get access rules for a subscription plan
 * @param planName - Name of the subscription plan
 * @returns Plan rules or FREE plan rules as default
 */
export function getPlanRules(planName: string) {
  return SUBSCRIPTION_PLAN_RULES[planName as SubscriptionPlanName] ?? SUBSCRIPTION_PLAN_RULES[SubscriptionPlanName.FREE];
}

/**
 * Top 5 indices (for FREE plan)
 */
export const TOP_5_INDICES = [
  'NIFTY50',
  'NIFTYMIDCAP',
  'NIFTYSMLCAP',
  'NIFTYIT',
  'NIFTYBANK',
];

/**
 * NIFTY50 stocks list
 * Note: This is a placeholder list. In production, this should be fetched from NSE API or maintained as a comprehensive list
 */
export const NIFTY50_STOCKS: string[] = [
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'INFY',
  'ICICIBANK',
  'HINDUNILVR',
  'BHARTIARTL',
  'SBIN',
  'BAJFINANCE',
  'LICI',
  'ITC',
  'HCLTECH',
  'AXISBANK',
  'KOTAKBANK',
  'LT',
  'ASIANPAINT',
  'MARUTI',
  'TITAN',
  'SUNPHARMA',
  'ULTRACEMCO',
  'WIPRO',
  'NESTLEIND',
  'ONGC',
  'POWERGRID',
  'NTPC',
  'M&M',
  'TATAMOTORS',
  'ADANIENT',
  'JSWSTEEL',
  'TATASTEEL',
  'COALINDIA',
  'GRASIM',
  'DIVISLAB',
  'HINDALCO',
  'CIPLA',
  'BAJAJFINSV',
  'TECHM',
  'HEROMOTOCO',
  'EICHERMOT',
  'APOLLOHOSP',
  'BRITANNIA',
  'INDUSINDBK',
  'DRREDDY',
  'ADANIPORTS',
  'TATACONSUM',
  'BPCL',
  'SBILIFE',
  'HDFCLIFE',
  'GODREJCP',
  'MARICO',
];

/**
 * NIFTY50 Company Names Mapping
 * Maps stock symbols to their full company names for search functionality
 */
export const NIFTY50_COMPANY_NAMES: Record<string, string> = {
  'RELIANCE': 'Reliance Industries Limited',
  'TCS': 'Tata Consultancy Services Limited',
  'HDFCBANK': 'HDFC Bank Limited',
  'INFY': 'Infosys Limited',
  'ICICIBANK': 'ICICI Bank Limited',
  'HINDUNILVR': 'Hindustan Unilever Limited',
  'BHARTIARTL': 'Bharti Airtel Limited',
  'SBIN': 'State Bank of India',
  'BAJFINANCE': 'Bajaj Finance Limited',
  'LICI': 'Life Insurance Corporation of India',
  'ITC': 'ITC Limited',
  'HCLTECH': 'HCL Technologies Limited',
  'AXISBANK': 'Axis Bank Limited',
  'KOTAKBANK': 'Kotak Mahindra Bank Limited',
  'LT': 'Larsen & Toubro Limited',
  'ASIANPAINT': 'Asian Paints Limited',
  'MARUTI': 'Maruti Suzuki India Limited',
  'TITAN': 'Titan Company Limited',
  'SUNPHARMA': 'Sun Pharmaceutical Industries Limited',
  'ULTRACEMCO': 'UltraTech Cement Limited',
  'WIPRO': 'Wipro Limited',
  'NESTLEIND': 'Nestle India Limited',
  'ONGC': 'Oil and Natural Gas Corporation Limited',
  'POWERGRID': 'Power Grid Corporation of India Limited',
  'NTPC': 'NTPC Limited',
  'M&M': 'Mahindra & Mahindra Limited',
  'TATAMOTORS': 'Tata Motors Limited',
  'ADANIENT': 'Adani Enterprises Limited',
  'JSWSTEEL': 'JSW Steel Limited',
  'TATASTEEL': 'Tata Steel Limited',
  'COALINDIA': 'Coal India Limited',
  'GRASIM': 'Grasim Industries Limited',
  'DIVISLAB': 'Divis Laboratories Limited',
  'HINDALCO': 'Hindalco Industries Limited',
  'CIPLA': 'Cipla Limited',
  'BAJAJFINSV': 'Bajaj Finserv Limited',
  'TECHM': 'Tech Mahindra Limited',
  'HEROMOTOCO': 'Hero MotoCorp Limited',
  'EICHERMOT': 'Eicher Motors Limited',
  'APOLLOHOSP': 'Apollo Hospitals Enterprise Limited',
  'BRITANNIA': 'Britannia Industries Limited',
  'INDUSINDBK': 'IndusInd Bank Limited',
  'DRREDDY': 'Dr. Reddy\'s Laboratories Limited',
  'ADANIPORTS': 'Adani Ports and Special Economic Zone Limited',
  'TATACONSUM': 'Tata Consumer Products Limited',
  'BPCL': 'Bharat Petroleum Corporation Limited',
  'SBILIFE': 'SBI Life Insurance Company Limited',
  'HDFCLIFE': 'HDFC Life Insurance Company Limited',
  'GODREJCP': 'Godrej Consumer Products Limited',
  'MARICO': 'Marico Limited',
};

/**
 * NIFTY Midcap 150 stocks list (cleaned - excluding overlaps with NIFTY50)
 * Official constituents from NSE India (as of Dec 2025)
 * Companies ranked 101-250 by market capitalization
 * Note: 3 stocks removed due to overlap with NIFTY50 (HEROMOTOCO, MARICO, INDUSINDBK)
 */
export const MIDCAP150_STOCKS: string[] = [
  'MUTHOOTFIN', 'UNIONBANK', 'VODAFONE', 'CUMMINSIND', 'IDBIBANK',
  'POLYCAB', 'INDIANBANK', 'INDUSTOWER', 'HDFCAMC', 'GMRAIRPORT',
  'ASHOKLEY', 'BSE', 'HPCL', 'BHEL', 'SWIGGY',
  'ICICIPRULI', 'PERSISTENT', 'ABUTIBRLA', 'LUPIN', 'PBFINTECH',
  'DABUR', 'SRF', 'MANKAPHARMA', 'BHARTIHEXA', 'PAYTM',
  'ABB', 'NHPC', 'SBICARDS', 'LTFINANCE', 'GEVERNOVA',
  'WAAREE', 'NYKAA', 'UNOMINDA', 'AUBANK', 'RAILVIKAS',
  'NMDC', 'SUZLON', 'DIXON', 'IDFCBANK', 'LLOYDSMET',
  'PRESTIGE', 'YESBANK', 'JINDALSTEL', 'IOBBANK', 'BHARATFORG',
  'TORRENTPWR', 'AUROPHARMA', 'FORTIS', 'PHOENIXMIL', 'BANKINDIA',
  'OILCOUNTRY', 'UPL', 'COROMANDEL', 'ORACLEOFIN', 'ALKEM',
  'GICINSURE', 'FEDERALBNK', 'GODREJPROP', 'MRF', 'ADANIGAS',
  'OBEROIREALTY', 'PATANJALIFO', 'SAILIND', 'BERGEPAINT', 'NATIONALAL',
  'ABBOTINDIA', 'SCHAEFFLER', 'SUNDARMFIN', 'JSWINFRA', 'MAXFINANCE',
  'FCL', 'GLENMARK', 'NIPPONLIFE', 'COLPAL', 'BHARATDYN',
  'COFORGE', 'APOLLOTUBES', 'IRCTC', 'MMFSL', 'MPHASIS',
  'BIOCON', 'KALYANJEWL', 'MOTILALFS', 'TATACOMM', 'LINDEIND',
  'PIIND', 'BANKBARODA', 'TUBEINVEST', 'VOLTAS', '360ONEWAM',
  'LTTS', 'BALKRISIND', 'SUPREMEIND', 'HUDCO', 'JKCEMENT',
  'ESCORTS', 'KEIIND', 'PETRONETLNG', 'COCHINSHIP', 'UNITEDBREWERY',
  'PGHL', 'GSK', '3MINDIA', 'IREDA', 'CONTAINERCO',
  'ASTRALPLY', 'DALMIABRUT', 'PAGEINDS', 'GUJFLUORO', 'BLUESTAR',
  'AIAENG', 'UCOBANK', 'NLCINDIA', 'THERMAX', 'AJANTAPHARMA',
  'IPCALABS', 'ENDURANCE', 'PREMIERENG', 'JUBLFOOD', 'GODFRYPHARMA',
  'TATAINVEST', 'SJVN', 'GODREJIND', 'TATAELXSI', 'GLOBALHEALTH',
  'ACC', 'APARINDS', 'CRISIL', 'APOLLOTYRES', 'KPITTECH',
  'EXIDEIND', 'KPRMILL', 'ADANIwilmar', 'GUJGAS', 'HONEYWELL',
  'SONABW', 'LICHSGFIN', 'INDRAPRASTHGAS', 'TATATECHNO', 'SYNGENE',
  'IRBIRDS', 'NEWINDIA', 'DEEPAKNTRT', 'ASTRAL', 'ATGL',
  'STARHEALTH', 'MARKSANS',
];

/**
 * Top 15 Mutual Funds (for FREE plan)
 * Scheme IDs fetched from mfapi.in API
 */
export const TOP_15_MUTUAL_FUNDS: string[] = [
  '120828', // Quant Small Cap Fund - Growth Option - Direct Plan
  '118778', // Nippon India Small Cap Fund - Direct Plan Growth Plan - Growth Option
  '125354', // Axis Small Cap Fund - Direct Plan - Growth
  '145206', // Tata Small Cap Fund-Direct Plan-Growth
  '147946', // BANDHAN SMALL CAP FUND - DIRECT PLAN GROWTH
  '118989', // HDFC Mid Cap Fund - Growth Option - Direct Plan
  '140228', // Edelweiss Mid Cap Fund - Direct Plan - Growth Option
  '118668', // Nippon India Growth Mid Cap Fund - Direct Plan Growth Plan - Growth Option
  '122639', // Parag Parikh Flexi Cap Fund - Direct Plan - Growth
  '118955', // HDFC Flexi Cap Fund - Growth Option - Direct Plan
  '120357', // Invesco India Large & Mid Cap Fund - Direct Plan - Growth
  '147704', // Motilal Oswal Large and Midcap Fund - Direct Plan Growth
  '120821', // Quant Multi Asset Allocation Fund - GROWTH OPTION - Direct Plan
  '120833', // Quant Infrastructure Fund - Growth Option-Direct Plan
  '119835', // SBI CONTRA FUND - DIRECT PLAN - GROWTH
];

/**
 * Top 30 Mutual Funds (for PREMIUM plan)
 * Comprehensive list of top performing mutual funds across categories
 */
export const TOP_30_MUTUAL_FUNDS: string[] = [
  // All TOP_15 funds
  ...TOP_15_MUTUAL_FUNDS,

  // Additional 15 funds for PREMIUM tier
  '125497', // SBI Small Cap Fund - Direct Plan - Growth
  '120505', // Axis Midcap Fund - Direct Plan - Growth
  '119071', // DSP Midcap Fund - Direct Plan - Growth
  '120492', // JM Flexicap Fund (Direct) - Growth Option
  '119718', // SBI Flexicap Fund - DIRECT PLAN - Growth Option
  '118834', // Mirae Asset Large & Midcap Fund - Direct Plan - Growth
  '118650', // Nippon India Multi Cap Fund - Direct Plan Growth Plan - Growth Option
  '118968', // HDFC Balanced Advantage Fund - Growth Plan - Direct Plan
  '120578', // SBI TECHNOLOGY OPPORTUNITIES FUND - DIRECT PLAN - GROWTH
  '120348', // Invesco India Contra Fund - Direct Plan - Growth
  '119060', // HDFC ELSS Tax saver - Growth Option - Direct Plan
  '120586', // ICICI Prudential Large Cap Fund (erstwhile Bluechip Fund) - Direct Plan - Growth
  '118927', // HDFC Focused Large-Cap Fund -Direct Plan - Growth Option
  '119551', // Mirae Asset Tax Saver Fund - Direct Plan - Growth
  '125501', // SBI Equity Hybrid Fund - Direct Plan - Growth
];


