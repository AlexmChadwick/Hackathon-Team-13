import { useState, useMemo } from 'react';
import { 
  CreditCard, Wallet, TrendingUp, Link2, Search, X, Check, RefreshCw, 
  Info, ArrowRight, Star, Users 
} from 'lucide-react';

// Types (exported for engine consumers)
export interface Card {
  id: string;
  name: string;
  type: 'store' | 'dual';
  annualFee: number;
  baseRate: number;
  storeRates: Record<string, number>;
  categoryRates?: Record<string, number>;
  perks: string[];
  highlight: string;
  store?: string;
  description: string;
}

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
}

export interface RewardProjection {
  monthly: number;
  annual: number;
}

type Toast = {
  id: number;
  message: string;
};

export const DEFAULT_SPENDING: Spending = {
  groceries: 320,
  gas: 110,
  dining: 175,
  online: 240,
  retail: 195,
  general: 85,
  amazon: 165,
  bestbuy: 55,
  walmart: 70,
  sams: 55,
  lowes: 35,
  verizon: 40,
  gap: 30,
  kohl: 25,
  ulta: 20,
};

// 10 realistic Synchrony PLCC / Dual cards (no annual fees, great for building credit)
export const CARDS: Card[] = [
  {
    id: 'amazon',
    name: 'Amazon Store Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { amazon: 0.05 },
    perks: ['5% back at Amazon (Prime members)', 'No annual fee', 'Easy instant financing options'],
    highlight: '5% at Amazon',
    store: 'Amazon',
    description: 'Perfect for frequent Amazon shoppers. Prime members unlock the top rate instantly.',
  },
  {
    id: 'bestbuy',
    name: 'Best Buy Credit Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { bestbuy: 0.05 },
    perks: ['5% back on all Best Buy purchases', 'My Best Buy rewards integration', '0% promo financing available'],
    highlight: '5% at Best Buy',
    store: 'Best Buy',
    description: 'Ideal for tech and electronics buyers. Great for building credit with on-time payments.',
  },
  {
    id: 'walmart',
    name: 'Walmart Rewards Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { walmart: 0.05 },
    perks: ['5% back at Walmart & Walmart.com', 'Walmart+ benefits integration', 'No annual fee ever'],
    highlight: '5% at Walmart',
    store: 'Walmart',
    description: 'Excellent everyday essential card. High rate on groceries, household & general shopping.',
  },
  {
    id: 'sams',
    name: 'Sam\'s Club Credit Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { sams: 0.03 },
    categoryRates: { gas: 0.02 },
    perks: ['3% at Sam\'s Club', '2% on gas (up to $6k/yr)', 'Cash rewards + travel redemptions'],
    highlight: '3% at Sam\'s + gas bonus',
    store: 'Sam\'s Club',
    description: 'Great for bulk buyers and drivers. Strong rewards on warehouse + everyday fuel.',
  },
  {
    id: 'lowes',
    name: 'Lowe\'s Advantage Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { lowes: 0.05 },
    perks: ['5% off eligible purchases at Lowe\'s', 'Special financing offers', 'No annual fee'],
    highlight: '5% at Lowe\'s',
    store: 'Lowe\'s',
    description: 'Best for home improvement. Every project earns serious cash back at the store you love.',
  },
  {
    id: 'verizon',
    name: 'Verizon Visa Card',
    type: 'dual',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { verizon: 0.04 },
    categoryRates: { gas: 0.02, dining: 0.02 },
    perks: ['4% back on Verizon purchases', '2% at gas stations & restaurants', 'Auto-pay bill credits'],
    highlight: '4% Verizon + 2% gas/dining',
    store: 'Verizon',
    description: 'A flexible dual card. Excellent if you pay a Verizon bill and want everyday category bonuses.',
  },
  {
    id: 'premier',
    name: 'Synchrony Premier Card',
    type: 'dual',
    annualFee: 0,
    baseRate: 0.02,
    storeRates: {},
    perks: ['2% cash back on everything', 'No foreign transaction fees', 'Premium concierge & travel benefits'],
    highlight: '2% everywhere flat',
    description: 'The simple powerhouse. Best flat-rate card with no categories to track. Perfect for beginners.',
  },
  {
    id: 'gap',
    name: 'Gap Inc. Credit Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { gap: 0.04, retail: 0.02 },
    perks: ['4% at Gap, Old Navy, Banana Republic, Athleta', 'Extra 10% off first purchase', 'No annual fee'],
    highlight: '4% at Gap brands',
    store: 'Gap',
    description: 'Fashion favorite. Earn the highest rates on your favorite everyday and weekend style brands.',
  },
  {
    id: 'kohls',
    name: 'Kohl\'s Charge Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { kohl: 0.05 },
    perks: ['5% back every day at Kohl\'s', 'Special birthday rewards', 'Easy approval for first cards'],
    highlight: '5% at Kohl\'s',
    store: 'Kohl\'s',
    description: 'Wonderful starter card. High everyday rate at Kohl\'s + simple rewards for new cardholders.',
  },
  {
    id: 'ulta',
    name: 'Ulta Beauty Credit Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { ulta: 0.05 },
    perks: ['5% back at Ulta Beauty', 'Platinum status boost opportunities', 'Beauty insider points synergy'],
    highlight: '5% at Ulta Beauty',
    store: 'Ulta',
    description: 'Beauty lovers rejoice. Highest rewards on all things beauty, skincare, and haircare.',
  },
];

// =====================
// RECOMMENDATION ENGINE (robust + exportable)
// =====================

// Internal: sanitize inputs for zero/NaN/negative and high spend safety
function sanitizeSpending(spending: Spending): Spending {
  const result = {} as Spending;
  (Object.keys(spending) as (keyof Spending)[]).forEach((key) => {
    const raw = spending[key];
    const val = Number(raw);
    result[key] = Math.max(0, isFinite(val) ? Math.round(val) : 0);
  });
  return result;
}

// Internal: single source of truth for rate lookup (store-specific wins, then category fallback, then base)
function getRate(card: Card, category: keyof Spending): number {
  // Store-specific rates take priority (exact key match for stores like amazon, gap, etc.)
  if (category in card.storeRates) {
    return card.storeRates[category];
  }
  // Category fallbacks (e.g. gas, dining on dual cards)
  if (card.categoryRates && category in card.categoryRates) {
    return card.categoryRates[category];
  }
  return card.baseRate;
}

// Internal: max rate a card offers (used for tie-breakers and high-rate filters)
function getMaxRate(card: Card): number {
  const storeVals = Object.values(card.storeRates);
  const catVals = card.categoryRates ? Object.values(card.categoryRates) : [];
  return Math.max(card.baseRate, ...storeVals, ...catVals);
}

// Core calculation: accurate monthly + rounded annual projection
// Handles zero spend (returns 0s), high spend (safe math), invalid inputs (sanitized)
export function calculateRewards(card: Card, spending: Spending): RewardProjection {
  const clean = sanitizeSpending(spending);
  let monthly = 0;

  (Object.entries(clean) as [keyof Spending, number][]).forEach(([category, amount]) => {
    const rate = getRate(card, category);
    monthly += amount * rate;
  });

  // Round only the annual projection; keep monthly precise for breakdowns
  const annual = Math.round(monthly * 12);
  return { monthly, annual };
}

// Generate smart, personalized reason text
// Enhanced for expanded cards, store rates, category fallbacks, zero/high spend cases
export function getRecommendationReason(card: Card, spending: Spending): string {
  const clean = sanitizeSpending(spending);
  const totalMonthlySpend = Object.values(clean).reduce((sum, v) => sum + v, 0);

  if (totalMonthlySpend === 0) {
    // Edge case: zero spend
    return 'No spend yet — rates apply instantly on your first purchases. Premier offers simple 2% everywhere.';
  }

  let bestCategory: keyof Spending | '' = '';
  let bestContribution = 0;
  let bestRate = 0;

  (Object.entries(clean) as [keyof Spending, number][]).forEach(([cat, amt]) => {
    if (amt <= 0) return;
    const rate = getRate(card, cat);
    const contrib = amt * rate;
    if (contrib > bestContribution) {
      bestContribution = contrib;
      bestCategory = cat;
      bestRate = rate;
    }
  });

  const catLabels: Record<string, string> = {
    amazon: 'Amazon', bestbuy: 'Best Buy', walmart: 'Walmart', sams: "Sam's Club",
    lowes: "Lowe's", verizon: 'Verizon', gap: 'Gap/Old Navy', kohl: "Kohl's", ulta: 'Ulta Beauty',
    groceries: 'groceries', gas: 'gas', dining: 'dining out', online: 'online shopping',
    retail: 'retail', general: 'everyday purchases',
  };

  const label = bestCategory ? (catLabels[bestCategory] || bestCategory) : 'your spending';
  const spendAmt = bestCategory ? clean[bestCategory] : 0;
  const annualFromTop = Math.round(bestContribution * 12);

  // Special handling for premier (flat-rate) even on high contribs
  if (card.id === 'premier') {
    const flatAnnual = Math.round(totalMonthlySpend * 0.02 * 12);
    return `Simple 2% flat rate on all $${totalMonthlySpend}/mo adds up to ~$${flatAnnual}/yr — no categories to track.`;
  }

  if (bestRate >= 0.04) {
    return `Earn ${Math.round(bestRate * 100)}% on your $${spendAmt}/mo at ${label} → ~$${annualFromTop}/yr`;
  }
  if (bestRate >= 0.03) {
    return `Strong ${Math.round(bestRate * 100)}% rate on ${label} ($${spendAmt}/mo) delivers ~$${annualFromTop}/yr.`;
  }
  if (bestContribution > 0) {
    return `Good match on ${label} (${Math.round(bestRate * 100)}%) contributing ~$${annualFromTop}/yr.`;
  }
  return `Base ${Math.round(card.baseRate * 100)}% rate applies across your spending profile.`;
}

// Get top recommendations — main exportable engine entrypoint
// Returns cards sorted by projected annual (desc), with attached accurate projections + smart reasons.
// Handles expanded list, all rates, edges.
export function getTopRecommendations(
  spending: Spending,
  cards: Card[] = CARDS
): Array<Card & { projected: number; monthly: number; reason: string }> {
  const cleanSpend = sanitizeSpending(spending);

  const scored = cards.map((card) => {
    const proj = calculateRewards(card, cleanSpend);
    const reason = getRecommendationReason(card, cleanSpend);
    return {
      ...card,
      projected: proj.annual,
      monthly: proj.monthly,
      reason,
    };
  });

  // Robust sort: highest projected, then highest max rate (for ties), then alpha
  return scored.sort((a, b) => {
    if (b.projected !== a.projected) return b.projected - a.projected;
    const maxA = getMaxRate(a);
    const maxB = getMaxRate(b);
    if (maxB !== maxA) return maxB - maxA;
    return a.name.localeCompare(b.name);
  });
}

// Main App
function App() {
  const [spending, setSpending] = useState<Spending>(DEFAULT_SPENDING);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'store' | 'dual' | 'highrate'>('all');
  const [sortMode, setSortMode] = useState<'recommended' | 'name' | 'bonus'>('recommended');
  const [, setIsConnecting] = useState(false);
  const [showPlaidModal, setShowPlaidModal] = useState(false);
  const [plaidStep, setPlaidStep] = useState<'select' | 'connecting' | 'success'>('select');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Live calculations
  const totalMonthly = useMemo(() => {
    return Object.values(spending).reduce((sum, v) => sum + v, 0);
  }, [spending]);

  const totalAnnualSpend = totalMonthly * 12;

  const rankedCards = useMemo(() => {
    // Use the exportable engine for accurate projections + personalized reasons on expanded list
    return getTopRecommendations(spending);
  }, [spending]);

  const top3 = useMemo(() => rankedCards.slice(0, 3), [rankedCards]);

  // Filtered + sorted for Explore grid
  const displayedCards = useMemo(() => {
    let result = [...rankedCards];

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.perks.some((p) => p.toLowerCase().includes(q)) ||
          c.highlight.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filter === 'store') result = result.filter((c) => c.type === 'store');
    if (filter === 'dual') result = result.filter((c) => c.type === 'dual');
    if (filter === 'highrate') {
      // Use engine helper for max rate (covers store + category fallback rates + base)
      result = result.filter((c) => getMaxRate(c) >= 0.04);
    }

    // Sort
    if (sortMode === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'bonus') {
      result.sort((a, b) => {
        // Use engine getMaxRate for accurate highest rate (incl category fallbacks)
        return getMaxRate(b) - getMaxRate(a);
      });
    }
    // recommended = already sorted by projected

    return result;
  }, [rankedCards, searchTerm, filter, sortMode]);

  // Dynamic insights (subtle financial literacy)
  const insights = useMemo(() => {
    const topCard = top3[0];
    const topProjected = topCard?.projected || 0;

    const flat1Percent = Math.round(totalAnnualSpend * 0.01);
    const extraVsOnePercent = Math.max(0, topProjected - flat1Percent);

    const topSpendEntry = Object.entries(spending).sort((a, b) => b[1] - a[1])[0];
    const topCat = topSpendEntry[0];
    const topCatAmount = topSpendEntry[1];

    const catNameMap: Record<string, string> = {
      groceries: 'groceries', gas: 'gas', dining: 'dining', online: 'online shopping',
      retail: 'retail', amazon: 'Amazon', bestbuy: 'Best Buy', walmart: 'Walmart',
    };
    const friendlyCat = catNameMap[topCat] || 'everyday purchases';

    const insightsList: string[] = [];

    if (extraVsOnePercent > 40) {
      insightsList.push(`Choosing your top match could earn you about $${extraVsOnePercent} more per year than a basic 1% card.`);
    }

    if (topCatAmount > 120) {
      insightsList.push(`Your biggest area is ${friendlyCat} ($${topCatAmount}/mo). Cards that reward this category deliver outsized value.`);
    }

    insightsList.push('All cards shown have $0 annual fees — every reward dollar stays with you.');

    if (topCard?.id === 'premier') {
      insightsList.push('Flat-rate cards like Premier remove complexity. Great choice when your spending spans many categories.');
    } else if (topCard) {
      insightsList.push('Seeing your real patterns lets you pick cards whose highest rates actually match your life.');
    }

    return insightsList.slice(0, 3);
  }, [top3, totalAnnualSpend, spending]);

  // Toast helper
  const showToast = (message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  // Update single spending value
  const updateSpending = (key: keyof Spending, value: number) => {
    const clamped = Math.max(0, Math.min(2000, Math.round(value)));
    setSpending((prev) => ({ ...prev, [key]: clamped }));
  };

  // Reset to sample
  const resetToSample = () => {
    setSpending(DEFAULT_SPENDING);
    showToast('Spending reset to realistic young adult sample');
  };

  // Quick presets
  const applyPreset = (preset: 'balanced' | 'online' | 'essentials' | 'minimal') => {
    let newSpending: Spending;
    if (preset === 'online') {
      newSpending = { ...DEFAULT_SPENDING, amazon: 280, online: 310, bestbuy: 90, gap: 55, ulta: 40, groceries: 240, dining: 130 };
    } else if (preset === 'essentials') {
      newSpending = { ...DEFAULT_SPENDING, groceries: 420, walmart: 120, gas: 160, sams: 95, dining: 110 };
    } else if (preset === 'minimal') {
      newSpending = {
        groceries: 200, gas: 70, dining: 90, online: 120, retail: 80, general: 55,
        amazon: 70, bestbuy: 25, walmart: 55, sams: 25, lowes: 15, verizon: 35, gap: 15, kohl: 15, ulta: 10,
      };
    } else {
      newSpending = { ...DEFAULT_SPENDING };
    }
    setSpending(newSpending);
    showToast(`Applied ${preset} spending profile`);
  };

  // Plaid mock flow
  const openPlaid = () => {
    setShowPlaidModal(true);
    setPlaidStep('select');
    setSelectedBank('');
  };

  const closePlaid = () => {
    setShowPlaidModal(false);
    setPlaidStep('select');
    setSelectedBank('');
    setIsConnecting(false);
  };

  const selectBank = (bank: string) => {
    setSelectedBank(bank);
    setPlaidStep('connecting');
    setIsConnecting(true);

    // Simulate secure connect
    setTimeout(() => {
      setIsConnecting(false);
      setPlaidStep('success');
    }, 1350);
  };

  const applyPlaidData = () => {
    setSpending(DEFAULT_SPENDING);
    closePlaid();
    showToast('Successfully imported your spending from connected accounts');
  };

  // Card detail
  const openCardDetail = (card: Card) => {
    setSelectedCard(card);
  };

  const closeCardDetail = () => setSelectedCard(null);

  // Compute breakdown for modal — reuses engine getRate for consistency with calculateRewards / category fallbacks / store rates
  const getBreakdown = (card: Card) => {
    const clean = sanitizeSpending(spending); // ensure accuracy for edge cases
    const entries = Object.entries(clean) as [keyof Spending, number][];
    return entries
      .map(([cat, amt]) => {
        const rate = getRate(card, cat);
        const monthlyPrecise = amt * rate;
        return {
          cat,
          amount: amt,
          rate,
          monthly: Math.round(monthlyPrecise), // round for display only
        };
      })
      .filter((r) => r.monthly > 0)
      .sort((a, b) => b.monthly - a.monthly);
  };

  // Render helpers
  const formatCurrency = (n: number) => `$${n.toLocaleString()}`;
  const formatPercent = (r: number) => `${Math.round(r * 100)}%`;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#334155]">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#0f766e] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold tracking-tight text-[#0f172a] text-xl">Synchrony Match</div>
              <div className="text-[10px] text-[#64748b] -mt-1">by Synchrony • HackathonDTC</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a href="#connect" className="px-3 py-1.5 hover:text-[#0f766e] transition-colors">Connect</a>
            <a href="#recommend" className="px-3 py-1.5 hover:text-[#0f766e] transition-colors">Recommendations</a>
            <a href="#explore" className="px-3 py-1.5 hover:text-[#0f766e] transition-colors">Explore Cards</a>
            <a href="#insights" className="px-3 py-1.5 hover:text-[#0f766e] transition-colors">Insights</a>
            <button onClick={resetToSample} className="btn btn-ghost ml-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="bg-gradient-to-b from-white to-[#f8fafc] border-b border-[#e2e8f0]">
        <div className="max-w-5xl mx-auto px-5 pt-14 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-[#ccfbf1] text-[#0f766e] text-xs font-semibold tracking-widest px-3 py-1 rounded-full mb-4">
            FOR FIRST-TIME CARDHOLDERS &amp; YOUNG ADULTS
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tighter text-[#0f172a] leading-none mb-4">
            Find the card that<br />actually rewards you.
          </h1>
          <p className="max-w-xl mx-auto text-xl text-[#475569] mb-8">
            Connect how you spend. Get instant, personalized recommendations from 10 real Synchrony cards.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={openPlaid} className="btn btn-primary text-base px-7 py-3">
              <Link2 className="w-4 h-4" /> Connect accounts with Plaid
            </button>
            <a href="#recommend" className="btn btn-secondary text-base px-7 py-3">
              See recommendations <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="mt-4 text-xs text-[#64748b]">No accounts required • All cards have $0 annual fee • Mock data demo</div>
        </div>
      </div>

      {/* CONNECT ACCOUNTS (Plaid mock) */}
      <div id="connect" className="max-w-7xl mx-auto px-5 pt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="section-title flex items-center gap-2">
              <Link2 className="w-6 h-6 text-[#0f766e]" /> Connect Accounts
            </div>
            <p className="text-[#64748b]">Securely link your spending (demo) to get accurate matches.</p>
          </div>
          <button onClick={openPlaid} className="btn btn-primary hidden md:flex">
            <Link2 className="w-4 h-4" /> Connect with Plaid
          </button>
        </div>

        <div className="card p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Current status + totals */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="badge badge-emerald">CONNECTED IN DEMO</div>
                <div className="text-xs text-[#64748b]">Sample profile active</div>
              </div>
              <div className="text-4xl font-semibold tabular-nums tracking-tight text-[#0f172a] mb-1">
                {formatCurrency(totalMonthly)} <span className="text-xl text-[#64748b] font-normal">/ month</span>
              </div>
              <div className="text-[#64748b] text-sm mb-4">≈ {formatCurrency(totalAnnualSpend)} annual spend</div>

              <div className="flex flex-wrap gap-2">
                <button onClick={openPlaid} className="btn btn-secondary text-sm">
                  <Link2 className="w-4 h-4" /> Reconnect / Import
                </button>
                <button onClick={resetToSample} className="btn btn-ghost text-sm">
                  <RefreshCw className="w-4 h-4" /> Reset to sample
                </button>
              </div>

              <div className="mt-5 text-xs bg-[#f1f5f9] rounded-xl p-3 text-[#475569] leading-snug">
                <span className="font-medium">Privacy note:</span> This is a fully functional mock. 
                No real data leaves your browser.
              </div>
            </div>

            {/* Quick presets */}
            <div>
              <div className="input-label mb-2">Quick spending profiles</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Balanced', key: 'balanced' as const },
                  { label: 'Online heavy', key: 'online' as const },
                  { label: 'Essentials', key: 'essentials' as const },
                  { label: 'Minimal', key: 'minimal' as const },
                ].map((p) => (
                  <button key={p.key} onClick={() => applyPreset(p.key)} className="btn btn-secondary text-sm py-2">
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-[#64748b]">
                Adjust any amount below — recommendations update instantly.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SPENDING EDITOR */}
      <div className="max-w-7xl mx-auto px-5 pt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-semibold text-lg text-[#0f172a]">Edit your monthly spending</div>
            <div className="text-xs text-[#64748b]">All values in USD. Changes recalculate everything live.</div>
          </div>
          <button onClick={resetToSample} className="btn btn-ghost text-sm md:hidden">
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        <div className="card p-5 md:p-6">
          {/* Grouped editor */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-6">
            {/* Everyday */}
            <div>
              <div className="input-label mb-2.5">Everyday</div>
              <div className="space-y-3">
                {(['groceries', 'gas', 'dining'] as const).map((key) => (
                  <div key={key} className="spending-row flex items-center gap-3">
                    <div className="w-20 text-sm capitalize text-[#475569]">{key}</div>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -mt-1.5 text-[#94a3b8] text-sm">$</div>
                      <input
                        type="number"
                        className="input pl-7 tabular-nums"
                        value={spending[key]}
                        onChange={(e) => updateSpending(key, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shopping */}
            <div>
              <div className="input-label mb-2.5">Shopping</div>
              <div className="space-y-3">
                {(['online', 'retail', 'general'] as const).map((key) => (
                  <div key={key} className="spending-row flex items-center gap-3">
                    <div className="w-20 text-sm capitalize text-[#475569]">{key}</div>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -mt-1.5 text-[#94a3b8] text-sm">$</div>
                      <input
                        type="number"
                        className="input pl-7 tabular-nums"
                        value={spending[key]}
                        onChange={(e) => updateSpending(key, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Specific Stores */}
            <div className="xl:col-span-3">
              <div className="input-label mb-2.5">Specific stores you shop at</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-3">
                {(
                  [
                    ['amazon', 'Amazon'], ['bestbuy', 'Best Buy'], ['walmart', 'Walmart'],
                    ['sams', "Sam's"], ['lowes', "Lowe's"], ['verizon', 'Verizon'],
                    ['gap', 'Gap/OldNavy'], ['kohl', "Kohl's"], ['ulta', 'Ulta'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="spending-row flex items-center gap-2">
                    <div className="w-[78px] text-sm text-[#475569] truncate">{label}</div>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -mt-1.5 text-[#94a3b8] text-sm">$</div>
                      <input
                        type="number"
                        className="input pl-7 text-sm py-1.5 tabular-nums"
                        value={spending[key]}
                        onChange={(e) => updateSpending(key, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <div className="font-medium text-[#0f172a]">Total monthly spend: <span className="tabular-nums">{formatCurrency(totalMonthly)}</span></div>
            <div className="text-[#64748b]">• Adjust above for instant personalized projections</div>
          </div>
        </div>
      </div>

      {/* YOUR RECOMMENDATIONS */}
      <div id="recommend" className="max-w-7xl mx-auto px-5 pt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#0f766e]" /> Your Top Recommendations
            </div>
            <p className="text-[#64748b]">Ranked for your current spending profile. All projections are annual.</p>
          </div>
          <div className="text-xs px-3 py-1 rounded-full bg-white border border-[#e2e8f0] text-[#64748b] hidden sm:block">
            Live • Updates as you edit
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {top3.map((card, index) => {
            // Prefer engine-provided smart reason (with zero/high edge handling + personalization)
            const reason = (card as any).reason || getRecommendationReason(card, spending);
            const isTop = index === 0;
            return (
              <div key={card.id} className={`card p-5 flex flex-col ${isTop ? 'ring-1 ring-[#0f766e]/70' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-xl tracking-tight text-[#0f172a]">{card.name}</div>
                    <div className="flex gap-1.5 mt-1">
                      <span className="badge badge-teal">{card.type === 'store' ? 'Store Card' : 'Dual Card'}</span>
                      <span className="badge badge-emerald">$0 fee</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Projected</div>
                    <div className="text-3xl font-semibold tabular-nums tracking-tighter text-[#0f766e]">
                      {formatCurrency(card.projected)}
                    </div>
                    <div className="text-xs -mt-0.5 text-[#64748b]">per year</div>
                  </div>
                </div>

                <div className="mt-auto pt-3 text-sm border-t">
                  <div className="text-[#334155]">{reason}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => openCardDetail(card)} className="btn btn-secondary flex-1 text-sm py-2">
                      View details &amp; breakdown
                    </button>
                    {isTop && <div className="badge badge-emerald px-2.5 py-1 text-[10px]">BEST FIT</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-xs text-[#64748b] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> 
          Numbers are calculated directly from your spending amounts × each card’s published rates.
        </div>
      </div>

      {/* EXPLORE ALL CARDS */}
      <div id="explore" className="max-w-7xl mx-auto px-5 pt-11">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="section-title">Explore All Cards</div>
            <div className="text-[#64748b]">Search, filter, and compare every Synchrony option.</div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#94a3b8]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search cards or perks..."
                className="input pl-10 py-2 text-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-[#64748b]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: 'All', val: 'all' as const },
                { label: 'Store cards', val: 'store' as const },
                { label: 'Dual / General', val: 'dual' as const },
                { label: 'High rewards (4%+)', val: 'highrate' as const },
              ].map((f) => (
                <button
                  key={f.val}
                  onClick={() => setFilter(f.val)}
                  className={`btn text-sm py-1.5 px-3.5 ${filter === f.val ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <select 
              value={sortMode} 
              onChange={(e) => setSortMode(e.target.value as any)}
              className="input py-2 text-sm w-auto sm:w-44"
            >
              <option value="recommended">Sort: Best for you</option>
              <option value="name">Sort: A–Z</option>
              <option value="bonus">Sort: Highest bonus rate</option>
            </select>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedCards.map((card) => {
            const annual = card.projected;
            return (
              <div key={card.id} className="card p-5 group flex flex-col">
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="font-semibold leading-tight text-[#0f172a] text-[17px] pr-1">{card.name}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="badge badge-slate">{card.type === 'store' ? 'PLCC' : 'Dual Card'}</span>
                      <span className="badge badge-emerald text-[10px]">$0 fee</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-[#64748b]">You’d earn</div>
                    <div className="font-semibold tabular-nums text-xl tracking-tight text-[#0f766e]">{formatCurrency(annual)}</div>
                  </div>
                </div>

                <div className="mt-3 text-sm">
                  <span className="rewards-pill">{card.highlight}</span>
                </div>

                <ul className="mt-3 text-sm space-y-1 text-[#475569] flex-1">
                  {card.perks.slice(0, 3).map((perk, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 mt-[3px] text-[#0f766e] shrink-0" /> {perk}
                    </li>
                  ))}
                </ul>

                <div className="pt-4 mt-4 border-t flex gap-2">
                  <button onClick={() => openCardDetail(card)} className="btn btn-secondary flex-1 text-sm py-2">
                    Details &amp; breakdown
                  </button>
                  <button 
                    onClick={() => {
                      // Jump to top 3 highlight
                      document.getElementById('recommend')?.scrollIntoView({ behavior: 'smooth' });
                    }} 
                    className="btn btn-ghost text-sm py-2"
                    title="See in recommendations"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {displayedCards.length === 0 && (
          <div className="text-center py-10 text-[#64748b]">No cards match your search. Try clearing filters.</div>
        )}
      </div>

      {/* INSIGHTS + FINANCIAL LITERACY */}
      <div id="insights" className="max-w-7xl mx-auto px-5 pt-10 pb-16">
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="text-[#0f766e]" />
              <div className="font-semibold text-lg">What your spending says</div>
            </div>
            <ul className="space-y-3 text-[15px]">
              {insights.map((text, idx) => (
                <li key={idx} className="flex gap-3 text-[#334155]">
                  <span className="mt-1.5 block w-1.5 h-1.5 rounded-full bg-[#0f766e] shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t text-xs text-[#64748b]">
              Seeing your spending patterns helps you choose rewards that fit your actual life — not the average person’s.
            </div>
          </div>

          <div className="lg:col-span-2 card p-6 bg-[#f8fafc] border-[#e2e8f0]">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Why these cards?
            </div>
            <div className="text-sm leading-relaxed text-[#475569]">
              Every card here has <span className="font-medium text-[#0f172a]">no annual fee</span>. 
              That means 100% of the rewards you earn stay yours. They are also excellent options for 
              building credit history through responsible everyday use.
            </div>
            <div className="mt-4 text-xs bg-white rounded-xl p-3 border border-[#e2e8f0]">
              Tip: The “best” card is the one whose highest reward categories match where you already spend the most.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="max-w-7xl mx-auto px-5 text-xs text-[#64748b] flex flex-col md:flex-row gap-y-1 justify-between">
          <div>Demo built for HackathonDTC • Uses mock Synchrony card data and a simulated Plaid flow.</div>
          <div>All projections are illustrative. Not financial advice.</div>
        </div>
      </footer>

      {/* PLAID CONNECT MODAL */}
      {showPlaidModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={closePlaid}>
          <div 
            className="modal bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-xl" 
            onClick={e => e.stopPropagation()}
          >
            {plaidStep === 'select' && (
              <>
                <div className="px-6 pt-6 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-xl">Connect your accounts</div>
                      <div className="text-sm text-[#64748b]">Powered by Plaid (demo)</div>
                    </div>
                    <button onClick={closePlaid} className="text-[#64748b]"><X /></button>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <div className="text-sm mb-3 text-[#475569]">Choose a bank to securely import recent transactions:</div>
                  <div className="space-y-2">
                    {['Chase', 'Bank of America', 'Capital One', 'Wells Fargo', 'Citibank'].map((bank) => (
                      <button
                        key={bank}
                        onClick={() => selectBank(bank)}
                        className="w-full text-left px-4 py-3 rounded-2xl border border-[#e2e8f0] hover:bg-[#f8fafc] hover:border-[#cbd5e1] flex items-center justify-between transition"
                      >
                        <span>{bank}</span>
                        <ArrowRight className="w-4 h-4 text-[#94a3b8]" />
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-center mt-5 text-[#94a3b8]">Your data is never stored. This is a simulation.</div>
                </div>
              </>
            )}

            {plaidStep === 'connecting' && (
              <div className="px-8 py-12 text-center">
                <div className="mx-auto mb-4 w-9 h-9 rounded-full border-2 border-[#0f766e] border-t-transparent animate-spin" />
                <div className="font-medium">Securely connecting to {selectedBank}...</div>
                <div className="text-sm text-[#64748b] mt-1">Verifying credentials and pulling last 90 days</div>
              </div>
            )}

            {plaidStep === 'success' && (
              <div className="px-6 py-8">
                <div className="mx-auto w-12 h-12 bg-[#d1fae5] text-[#059669] rounded-2xl flex items-center justify-center mb-4">
                  <Check className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-xl">Connection successful</div>
                  <p className="text-[#475569] mt-1 text-sm">We found transactions across your categories.</p>
                </div>

                <div className="bg-[#f8fafc] rounded-2xl p-4 mt-6 text-sm">
                  <div className="font-medium mb-1">Imported categories</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[#475569] text-sm">
                    <div>Groceries • Gas • Dining</div>
                    <div>Online • Retail • Specific stores</div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={closePlaid} className="btn btn-secondary flex-1">Cancel</button>
                  <button onClick={applyPlaidData} className="btn btn-primary flex-1">Apply spending to profile</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CARD DETAIL MODAL */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-start justify-center pt-12 p-4" onClick={closeCardDetail}>
          <div className="modal bg-white w-full max-w-lg rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 pb-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold text-2xl tracking-tight">{selectedCard.name}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="badge badge-teal">{selectedCard.type === 'store' ? 'Store Card (PLCC)' : 'Dual Card'}</span>
                    <span className="badge badge-emerald">$0 annual fee</span>
                  </div>
                </div>
                <button onClick={closeCardDetail} className="text-[#64748b]"><X /></button>
              </div>

              <div className="mt-3 text-[#475569]">{selectedCard.description}</div>

              <div className="mt-5 rounded-2xl bg-[#f8fafc] px-4 py-3">
                <div className="uppercase text-[10px] tracking-widest text-[#64748b] mb-1">Projected for you this year</div>
                <div className="text-4xl font-semibold tabular-nums tracking-[-1.5px] text-[#0f766e]">
                  {formatCurrency(calculateRewards(selectedCard, spending).annual)}
                </div>
              </div>
            </div>

            {/* Rates + Breakdown */}
            <div className="border-t px-6 py-5 bg-white">
              <div className="font-medium mb-2 text-sm">Rewards breakdown (based on your spending)</div>
              <div className="space-y-1 text-sm">
                {getBreakdown(selectedCard).map((row, i) => (
                  <div key={i} className="flex justify-between py-1 border-b last:border-none border-[#f1f5f9]">
                    <div className="capitalize text-[#475569]">{row.cat}</div>
                    <div className="tabular-nums text-right">
                      {formatCurrency(row.amount)} × {formatPercent(row.rate)} = <span className="font-medium">${row.monthly}</span>/mo
                    </div>
                  </div>
                ))}
                {getBreakdown(selectedCard).length === 0 && (
                  <div className="text-[#64748b]">No matching high-rate spend detected. Base rate applies across the board.</div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-[#f8fafc]">
              <div className="text-xs font-medium mb-1.5">Key perks</div>
              <ul className="grid gap-y-1 text-sm">
                {selectedCard.perks.map((p, idx) => (
                  <li key={idx} className="flex gap-2"><Check className="mt-1 w-4 h-4 text-[#0f766e]" />{p}</li>
                ))}
              </ul>
              <div className="text-[11px] mt-4 text-[#64748b]">
                On-time payments on Synchrony cards can help build credit history. Choose responsibly.
              </div>
            </div>

            <div className="p-4 border-t flex">
              <button onClick={closeCardDetail} className="btn btn-secondary flex-1">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[80] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="toast bg-[#0f172a] text-white px-4 py-2.5 rounded-2xl text-sm shadow-xl flex items-center gap-2">
            <Check className="w-4 h-4" /> {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
