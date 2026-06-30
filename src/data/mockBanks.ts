// Mock bank profiles + realistic Plaid-style transaction history for the demo.
// The "backend" now works by providing per-bank mock transactions (with merchants + categories).
// Spending totals are DERIVED by aggregating these transactions.
// This allows precise control:
// - Store-specific spend (amazon, wholefoods, walmart, gap, etc.) only rewards matching PLCCs.
// - General "groceries" does NOT count as Amazon/Whole Foods for the Prime card.
// - A person who shops almost exclusively at Walmart will see the Walmart card rise.

export interface Spending {
  groceries: number;
  gas: number;
  dining: number;
  online: number;
  retail: number;
  general: number;
  amazon: number;
  bestbuy: number;
  walmart: number;
  sams: number;
  lowes: number;
  verizon: number;
  gap: number;
  kohl: number;
  ulta: number;
  jcpenney: number;
  ashley: number;
  ae: number;
  wholefoods: number;
}

export interface MockTransaction {
  id: string;
  merchant: string;
  amount: number;
  plaidCategory: string; // Plaid-like category for realism
}

export interface MockBank {
  id: string;
  name: string;
  tagline: string;
  transactions: MockTransaction[];
  // spending is derived at load time from transactions (single source of truth)
  spending: Spending;
}

// --- Transaction normalizer (the "intelligent" part) ---
// Specific merchants win for PLCCs. General groceries do not leak to Amazon 5%.
const MERCHANT_RULES: Array<{ match: string; bucket: keyof Spending }> = [
  // Amazon ecosystem (strict)
  { match: 'amazon', bucket: 'amazon' },
  { match: 'amzn', bucket: 'amazon' },
  { match: 'whole foods', bucket: 'wholefoods' },
  { match: 'wholefoods', bucket: 'wholefoods' },

  // Walmart specific (important for PLCC demo)
  { match: 'walmart', bucket: 'walmart' },
  { match: 'wal-mart', bucket: 'walmart' },
  { match: 'wal mart', bucket: 'walmart' },

  // Sam's
  { match: "sam's", bucket: 'sams' },
  { match: 'sams club', bucket: 'sams' },
  { match: 'samsclub', bucket: 'sams' },

  // Fashion / style PLCCs
  { match: 'gap', bucket: 'gap' },
  { match: 'old navy', bucket: 'gap' },
  { match: "kohl's", bucket: 'kohl' },
  { match: 'kohls', bucket: 'kohl' },
  { match: 'ulta', bucket: 'ulta' },
  { match: 'american eagle', bucket: 'ae' },
  { match: 'aerie', bucket: 'ae' },
  { match: 'jcp', bucket: 'jcpenney' },
  { match: 'jcpenney', bucket: 'jcpenney' },
  { match: 'ashley', bucket: 'ashley' },

  // Other specific stores
  { match: 'best buy', bucket: 'bestbuy' },
  { match: 'bestbuy', bucket: 'bestbuy' },
  { match: "lowe's", bucket: 'lowes' },
  { match: 'lowes', bucket: 'lowes' },
  { match: 'verizon', bucket: 'verizon' },

  // Broad categories via merchant hints (fallback)
  { match: 'shell', bucket: 'gas' },
  { match: 'exxon', bucket: 'gas' },
  { match: 'chevron', bucket: 'gas' },
  { match: 'bp gas', bucket: 'gas' },
  { match: 'speedway', bucket: 'gas' },
  { match: 'trader joe', bucket: 'groceries' },
  { match: 'safeway', bucket: 'groceries' },
  { match: 'kroger', bucket: 'groceries' },
  { match: 'publix', bucket: 'groceries' },
  { match: 'whole foods', bucket: 'wholefoods' }, // already covered
  { match: 'target', bucket: 'retail' },
  { match: 'costco', bucket: 'sams' }, // treat similar bulk
  { match: 'netflix', bucket: 'online' },
  { match: 'spotify', bucket: 'online' },
  { match: 'doordash', bucket: 'dining' },
  { match: 'uber eats', bucket: 'dining' },
  { match: 'starbucks', bucket: 'dining' },
  { match: 'chipotle', bucket: 'dining' },
  { match: 'mcdonald', bucket: 'dining' },
];

function normalizeTransaction(tx: MockTransaction): keyof Spending | null {
  const text = `${tx.merchant} ${tx.plaidCategory}`.toLowerCase();

  for (const rule of MERCHANT_RULES) {
    if (text.includes(rule.match)) {
      return rule.bucket;
    }
  }

  // Plaid category fallbacks when merchant is generic
  const cat = tx.plaidCategory.toLowerCase();
  if (cat.includes('grocery') || cat.includes('supermarket')) return 'groceries';
  if (cat.includes('gas') || cat.includes('fuel')) return 'gas';
  if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dining')) return 'dining';
  if (cat.includes('online') || cat.includes('digital')) return 'online';
  if (cat.includes('retail') || cat.includes('department')) return 'retail';
  if (cat.includes('shopping')) return 'retail'; // conservative

  return null;
}

export function deriveSpendingFromTransactions(transactions: MockTransaction[]): Spending {
  const totals: Spending = {
    groceries: 0,
    gas: 0,
    dining: 0,
    online: 0,
    retail: 0,
    general: 0,
    amazon: 0,
    bestbuy: 0,
    walmart: 0,
    sams: 0,
    lowes: 0,
    verizon: 0,
    gap: 0,
    kohl: 0,
    ulta: 0,
    jcpenney: 0,
    ashley: 0,
    ae: 0,
    wholefoods: 0,
  };

  for (const tx of transactions) {
    const bucket = normalizeTransaction(tx);
    if (bucket && bucket in totals) {
      totals[bucket] += Math.round(tx.amount);
    } else {
      // Unknown → general spend (gets base rate on most cards)
      totals.general += Math.round(tx.amount);
    }
  }

  // Ensure no negative / NaN
  (Object.keys(totals) as (keyof Spending)[]).forEach((k) => {
    totals[k] = Math.max(0, Math.round(totals[k]));
  });

  return totals;
}

// ========== TRANSACTION DATA (mock Plaid history) ==========

// Chase Checking — Heavy Amazon & online. Very little at competing stores.
const CHASE_TRANSACTIONS: MockTransaction[] = [
  { id: 'c1', merchant: 'Amazon.com', amount: 47, plaidCategory: 'Shopping' },
  { id: 'c2', merchant: 'Amazon.com', amount: 29, plaidCategory: 'Shopping' },
  { id: 'c3', merchant: 'AMZN Prime Video', amount: 15, plaidCategory: 'Digital' },
  { id: 'c4', merchant: 'Amazon.com', amount: 63, plaidCategory: 'Shopping' },
  { id: 'c5', merchant: 'Whole Foods Market', amount: 34, plaidCategory: 'Groceries' },
  { id: 'c6', merchant: 'Amazon.com', amount: 22, plaidCategory: 'Shopping' },
  { id: 'c7', merchant: 'Netflix', amount: 16, plaidCategory: 'Online' },
  { id: 'c8', merchant: 'BestBuy.com', amount: 38, plaidCategory: 'Electronics' },
  { id: 'c9', merchant: 'Amazon.com', amount: 51, plaidCategory: 'Shopping' },
  { id: 'c10', merchant: 'Spotify', amount: 11, plaidCategory: 'Digital' },
  { id: 'c11', merchant: 'Target', amount: 27, plaidCategory: 'Retail' },
  { id: 'c12', merchant: 'Amazon.com', amount: 19, plaidCategory: 'Shopping' },
  { id: 'c13', merchant: 'Whole Foods Market', amount: 21, plaidCategory: 'Groceries' },
  { id: 'c14', merchant: 'Amazon.com', amount: 44, plaidCategory: 'Shopping' },
  { id: 'c15', merchant: 'Uber Eats', amount: 24, plaidCategory: 'Food Delivery' },
  { id: 'c16', merchant: 'Amazon.com', amount: 33, plaidCategory: 'Shopping' },
  { id: 'c17', merchant: 'Best Buy', amount: 45, plaidCategory: 'Electronics' },
  { id: 'c18', merchant: 'Amazon.com', amount: 28, plaidCategory: 'Shopping' },
];

// Capital One — Gas stations + Sam's Club bulk. Walmart for everyday too.
const CAPITAL_ONE_TRANSACTIONS: MockTransaction[] = [
  { id: 'co1', merchant: 'Shell', amount: 38, plaidCategory: 'Gas' },
  { id: 'co2', merchant: "Sam's Club", amount: 112, plaidCategory: 'Wholesale Club' },
  { id: 'co3', merchant: 'Exxon', amount: 29, plaidCategory: 'Gas' },
  { id: 'co4', merchant: 'Walmart Supercenter', amount: 67, plaidCategory: 'Groceries' },
  { id: 'co5', merchant: "Sam's Club", amount: 58, plaidCategory: 'Wholesale Club' },
  { id: 'co6', merchant: 'Chevron', amount: 44, plaidCategory: 'Gas' },
  { id: 'co7', merchant: 'Walmart', amount: 31, plaidCategory: 'Retail' },
  { id: 'co8', merchant: "Sam's Club Gas", amount: 27, plaidCategory: 'Gas' },
  { id: 'co9', merchant: 'Kroger', amount: 48, plaidCategory: 'Groceries' },
  { id: 'co10', merchant: "Sam's Club", amount: 95, plaidCategory: 'Wholesale Club' },
  { id: 'co11', merchant: 'Shell', amount: 33, plaidCategory: 'Gas' },
  { id: 'co12', merchant: 'Walmart', amount: 54, plaidCategory: 'Groceries' },
  { id: 'co13', merchant: "Sam's Club", amount: 41, plaidCategory: 'Wholesale Club' },
  { id: 'co14', merchant: 'Exxon', amount: 25, plaidCategory: 'Gas' },
  { id: 'co15', merchant: 'Lowe\'s', amount: 52, plaidCategory: 'Home Improvement' },
  { id: 'co16', merchant: 'Walmart Supercenter', amount: 39, plaidCategory: 'Groceries' },
  { id: 'co17', merchant: 'Chipotle', amount: 14, plaidCategory: 'Restaurants' },
];

// Fashion Bank — Style & department store focused. Specific brands high.
const FASHION_TRANSACTIONS: MockTransaction[] = [
  { id: 'f1', merchant: 'Gap', amount: 48, plaidCategory: 'Apparel' },
  { id: 'f2', merchant: 'Old Navy', amount: 35, plaidCategory: 'Apparel' },
  { id: 'f3', merchant: "Kohl's", amount: 62, plaidCategory: 'Department Store' },
  { id: 'f4', merchant: 'Ulta Beauty', amount: 44, plaidCategory: 'Beauty' },
  { id: 'f5', merchant: 'American Eagle', amount: 39, plaidCategory: 'Apparel' },
  { id: 'f6', merchant: 'Target', amount: 41, plaidCategory: 'Retail' },
  { id: 'f7', merchant: "Kohl's", amount: 29, plaidCategory: 'Department Store' },
  { id: 'f8', merchant: 'Gap', amount: 25, plaidCategory: 'Apparel' },
  { id: 'f9', merchant: 'Aerie', amount: 31, plaidCategory: 'Apparel' },
  { id: 'f10', merchant: 'Ulta Beauty', amount: 23, plaidCategory: 'Beauty' },
  { id: 'f11', merchant: 'JCPenney', amount: 38, plaidCategory: 'Department Store' },
  { id: 'f12', merchant: "Kohl's", amount: 47, plaidCategory: 'Department Store' },
  { id: 'f13', merchant: 'American Eagle', amount: 28, plaidCategory: 'Apparel' },
  { id: 'f14', merchant: 'Starbucks', amount: 12, plaidCategory: 'Coffee' },
  { id: 'f15', merchant: 'Old Navy', amount: 38, plaidCategory: 'Apparel' },
  { id: 'f16', merchant: 'Ulta Beauty', amount: 29, plaidCategory: 'Beauty' },
  { id: 'f17', merchant: 'Target', amount: 33, plaidCategory: 'Retail' },
  { id: 'f18', merchant: 'Gap', amount: 22, plaidCategory: 'Apparel' },
  { id: 'f19', merchant: 'JCPenney', amount: 19, plaidCategory: 'Department Store' },
];

// Student Bank — Balanced mix. Some Amazon but not dominant. Real life variety.
const STUDENT_TRANSACTIONS: MockTransaction[] = [
  { id: 's1', merchant: 'Kroger', amount: 52, plaidCategory: 'Groceries' },
  { id: 's2', merchant: 'Amazon.com', amount: 28, plaidCategory: 'Shopping' },
  { id: 's3', merchant: 'Shell', amount: 31, plaidCategory: 'Gas' },
  { id: 's4', merchant: 'Walmart', amount: 44, plaidCategory: 'Groceries' },
  { id: 's5', merchant: 'Chipotle', amount: 13, plaidCategory: 'Restaurants' },
  { id: 's6', merchant: 'Target', amount: 35, plaidCategory: 'Retail' },
  { id: 's7', merchant: 'Amazon.com', amount: 19, plaidCategory: 'Shopping' },
  { id: 's8', merchant: 'Verizon Wireless', amount: 42, plaidCategory: 'Telecom' },
  { id: 's9', merchant: "Sam's Club", amount: 48, plaidCategory: 'Wholesale Club' },
  { id: 's10', merchant: 'Gap', amount: 22, plaidCategory: 'Apparel' },
  { id: 's11', merchant: 'Best Buy', amount: 27, plaidCategory: 'Electronics' },
  { id: 's12', merchant: 'Starbucks', amount: 9, plaidCategory: 'Coffee' },
  { id: 's13', merchant: 'Ulta Beauty', amount: 17, plaidCategory: 'Beauty' },
  { id: 's14', merchant: 'Amazon.com', amount: 24, plaidCategory: 'Shopping' },
  { id: 's15', merchant: 'Lowe\'s', amount: 18, plaidCategory: 'Home Improvement' },
  { id: 's16', merchant: 'Whole Foods Market', amount: 23, plaidCategory: 'Groceries' },
  { id: 's17', merchant: 'Exxon', amount: 26, plaidCategory: 'Gas' },
  { id: 's18', merchant: 'Kohl\'s', amount: 21, plaidCategory: 'Department Store' },
  { id: 's19', merchant: 'DoorDash', amount: 18, plaidCategory: 'Food Delivery' },
  { id: 's20', merchant: 'Walmart', amount: 29, plaidCategory: 'Groceries' },
];

// Compute spendings from transactions (source of truth)
const CHASE_SPENDING = deriveSpendingFromTransactions(CHASE_TRANSACTIONS);
const CAPITAL_ONE_SPENDING = deriveSpendingFromTransactions(CAPITAL_ONE_TRANSACTIONS);
const FASHION_SPENDING = deriveSpendingFromTransactions(FASHION_TRANSACTIONS);
const STUDENT_SPENDING = deriveSpendingFromTransactions(STUDENT_TRANSACTIONS);

export const MOCK_BANKS: MockBank[] = [
  {
    id: 'chase',
    name: 'Chase Checking',
    tagline: 'Heavy Amazon & online shopper',
    transactions: CHASE_TRANSACTIONS,
    spending: CHASE_SPENDING,
  },
  {
    id: 'capitalone',
    name: 'Capital One',
    tagline: 'High gas + Sam\'s Club bulk buyer',
    transactions: CAPITAL_ONE_TRANSACTIONS,
    spending: CAPITAL_ONE_SPENDING,
  },
  {
    id: 'fashion',
    name: 'Fashion Bank',
    tagline: 'Retail & style focused',
    transactions: FASHION_TRANSACTIONS,
    spending: FASHION_SPENDING,
  },
  {
    id: 'student',
    name: 'Student Bank',
    tagline: 'Balanced everyday spending',
    transactions: STUDENT_TRANSACTIONS,
    spending: STUDENT_SPENDING,
  },
];

export const DEFAULT_BANK = MOCK_BANKS.find((b) => b.id === 'student')!;

export function getBankById(id: string): MockBank | undefined {
  return MOCK_BANKS.find((b) => b.id === id);
}

// Convenience: get a few sample merchants for UI display
export function getSampleMerchants(bank: MockBank, count = 3): string {
  return bank.transactions
    .slice(0, count)
    .map((t) => t.merchant)
    .join(', ');
}
