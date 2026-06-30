import { useState, useMemo, useEffect } from 'react';
import { 
  CreditCard, Wallet, TrendingUp, Link2, Search, X, Check, RefreshCw, 
  Info, ArrowRight, Star, Users, Plus, Minus, HelpCircle 
} from 'lucide-react';

// Types
interface Card {
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

interface Spending {
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

type Toast = {
  id: number;
  message: string;
};

const DEFAULT_SPENDING: Spending = {
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
const CARDS: Card[] = [
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

// Recommendation engine
function calculateMonthlyRewards(card: Card, spending: Spending): number {
  let total = 0;
  const entries = Object.entries(spending) as [keyof Spending, number][];

  for (const [category, amount] of entries) {
    let rate = card.baseRate;

    // Exact store match wins
    if (card.storeRates[category]) {
      rate = card.storeRates[category];
    } 
    // Category bonus
    else if (card.categoryRates && card.categoryRates[category]) {
      rate = card.categoryRates[category];
    }

    total += amount * rate;
  }
  return total;
}

function calculateAnnualRewards(card: Card, spending: Spending): number {
  return Math.round(calculateMonthlyRewards(card, spending) * 12);
}

// Generate smart reason text — clearer, more human
function getRecommendationReason(card: Card, spending: Spending): string {
  const entries = Object.entries(spending) as [keyof Spending, number][];
  let bestCategory = '';
  let bestContribution = 0;
  let bestRate = 0;

  for (const [cat, amt] of entries) {
    let rate = card.baseRate;
    if (card.storeRates[cat]) rate = card.storeRates[cat];
    else if (card.categoryRates?.[cat]) rate = card.categoryRates[cat];

    const contrib = amt * rate;
    if (contrib > bestContribution) {
      bestContribution = contrib;
      bestCategory = cat;
      bestRate = rate;
    }
  }

  const catLabels: Record<string, string> = {
    amazon: 'Amazon', bestbuy: 'Best Buy', walmart: 'Walmart', sams: "Sam's Club",
    lowes: "Lowe's", verizon: 'Verizon', gap: 'Gap brands', kohl: "Kohl's", ulta: 'Ulta Beauty',
    groceries: 'groceries', gas: 'gas', dining: 'dining', online: 'online', 
    retail: 'retail', general: 'everyday',
  };

  const label = catLabels[bestCategory] || 'your spending';
  const annualFromTop = Math.round(bestContribution * 12);
  const pct = Math.round(bestRate * 100);

  if (bestRate >= 0.04) {
    return `You spend $${spending[bestCategory as keyof Spending]}/mo at ${label} — this card pays ${pct}% there for ~$${annualFromTop}/yr in rewards.`;
  }
  if (card.id === 'premier') {
    return `Simple 2% flat on everything. No tracking needed. Predictable value across all your spending.`;
  }
  return `Strong ${pct}% match on ${label} ($${spending[bestCategory as keyof Spending]}/mo) → ~$${annualFromTop}/yr.`;
}

// Get top contributing categories for comparison view
function getTopContribs(card: Card, spending: Spending, n = 2) {
  const entries = Object.entries(spending) as [keyof Spending, number][];
  return entries
    .map(([cat, amt]) => {
      let rate = card.baseRate;
      if (card.storeRates[cat]) rate = card.storeRates[cat];
      else if (card.categoryRates?.[cat]) rate = card.categoryRates[cat];
      return { cat, amt, rate, contrib: Math.round(amt * rate) };
    })
    .sort((a, b) => b.contrib - a.contrib)
    .slice(0, n);
}

function getCardProjected(card: Card, spending: Spending) {
  return calculateAnnualRewards(card, spending);
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
  const [isUpdating, setIsUpdating] = useState(false); // for live polish on presets
  const [showCompare, setShowCompare] = useState(false);

  // Live calculations
  const totalMonthly = useMemo(() => {
    return Object.values(spending).reduce((sum, v) => sum + v, 0);
  }, [spending]);

  // Premium: close modals on Escape, smooth UX
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCard) closeCardDetail();
        else if (showPlaidModal) closePlaid();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCard, showPlaidModal]);

  // Subtle loading polish when spending changes via presets
  const triggerUpdate = (newSpending: Spending) => {
    setIsUpdating(true);
    setSpending(newSpending);
    setTimeout(() => setIsUpdating(false), 220);
  };

  const totalAnnualSpend = totalMonthly * 12;

  const rankedCards = useMemo(() => {
    return [...CARDS]
      .map((card) => ({
        ...card,
        projected: getCardProjected(card, spending),
      }))
      .sort((a, b) => b.projected - a.projected);
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
      result = result.filter((c) => Object.values(c.storeRates).some((r) => r >= 0.04) || c.baseRate >= 0.02);
    }

    // Sort (non-mutating)
    if (sortMode === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'bonus') {
      result = [...result].sort((a, b) => {
        const maxA = Math.max(a.baseRate, ...Object.values(a.storeRates), ...(a.categoryRates ? Object.values(a.categoryRates) : []));
        const maxB = Math.max(b.baseRate, ...Object.values(b.storeRates), ...(b.categoryRates ? Object.values(b.categoryRates) : []));
        return maxB - maxA;
      });
    }
    // recommended = already sorted by projected

    return result;
  }, [rankedCards, searchTerm, filter, sortMode]);

  // Dynamic insights (subtle financial literacy — insightful, never preachy)
  const insights = useMemo(() => {
    const topCard = top3[0];
    const topProjected = topCard?.projected || 0;

    const flat1Percent = Math.round(totalAnnualSpend * 0.01);
    const extraVsOnePercent = Math.max(0, topProjected - flat1Percent);

    const sortedSpend = Object.entries(spending).sort((a, b) => b[1] - a[1]);
    const topSpendEntry = sortedSpend[0];
    const topCat = topSpendEntry[0];
    const topCatAmount = topSpendEntry[1];

    const catNameMap: Record<string, string> = {
      groceries: 'groceries', gas: 'gas', dining: 'dining', online: 'online shopping',
      retail: 'retail', amazon: 'Amazon', bestbuy: 'Best Buy', walmart: 'Walmart',
      sams: "Sam's Club", lowes: "Lowe's", verizon: 'Verizon', gap: 'Gap brands', kohl: "Kohl's", ulta: 'Ulta',
    };
    const friendlyCat = catNameMap[topCat] || 'everyday purchases';

    const insightsList: string[] = [];

    if (extraVsOnePercent > 35) {
      insightsList.push(`Choosing your top match could earn about $${extraVsOnePercent} more per year than a basic 1% card on the same spending.`);
    }

    if (topCatAmount > 120) {
      insightsList.push(`Your biggest spend area is ${friendlyCat} ($${topCatAmount}/mo). Cards that actually reward this category turn the same dollars into more rewards.`);
    }

    // New subtle powerful insight
    insightsList.push('Rewards that match your real life mean more value from the same spending.');

    if (topCard?.id === 'premier') {
      insightsList.push('Flat-rate cards remove the guesswork. Consistent 2% works across whatever life throws at your wallet.');
    } else if (topCard) {
      insightsList.push('The right card for you is simply the one whose high rates overlap most with what you already do.');
    }

    // Additional non-preachy: if many store cards top
    const storeCount = top3.filter(c => c.type === 'store').length;
    if (storeCount >= 2) {
      insightsList.push('When you shop at the same places often, store cards can quietly outperform general ones.');
    }

    return insightsList.slice(0, 4);
  }, [top3, totalAnnualSpend, spending]);

  // Toast helper
  const showToast = (message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  // Update single spending value — premium clamp + instant
  const updateSpending = (key: keyof Spending, value: number) => {
    const clamped = Math.max(0, Math.min(2000, Math.round(value)));
    setSpending((prev) => ({ ...prev, [key]: clamped }));
  };

  const stepSpending = (key: keyof Spending, delta: number) => {
    updateSpending(key, spending[key] + delta);
  };

  // Reset to sample
  const resetToSample = () => {
    triggerUpdate(DEFAULT_SPENDING);
    showToast('Spending reset to realistic young adult sample');
  };

  // Quick presets — polished with live feel
  const applyPreset = (preset: 'balanced' | 'online' | 'essentials' | 'minimal' | 'fashion') => {
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
    } else if (preset === 'fashion') {
      newSpending = { ...DEFAULT_SPENDING, gap: 95, kohl: 85, ulta: 70, retail: 140, amazon: 110, general: 60 };
    } else {
      newSpending = { ...DEFAULT_SPENDING };
    }
    triggerUpdate(newSpending);
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

  // Compute FULL breakdown for modal table (all categories, even base)
  const getBreakdown = (card: Card) => {
    const entries = Object.entries(spending) as [keyof Spending, number][];
    const rows = entries.map(([cat, amt]) => {
      let rate = card.baseRate;
      if (card.storeRates[cat]) rate = card.storeRates[cat];
      else if (card.categoryRates?.[cat]) rate = card.categoryRates[cat];
      const monthly = Math.round(amt * rate);
      return {
        cat,
        amount: amt,
        rate,
        monthly,
        annual: monthly * 12,
      };
    });
    // Sort by monthly desc so high-value rows surface first
    return rows.sort((a, b) => b.monthly - a.monthly);
  };

  // Full totals for table
  const getBreakdownTotals = (breakdown: ReturnType<typeof getBreakdown>) => {
    const monthlyTotal = breakdown.reduce((s, r) => s + r.monthly, 0);
    return { monthly: monthlyTotal, annual: monthlyTotal * 12 };
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
              <div className={`text-4xl font-semibold tabular-nums tracking-tight text-[#0f172a] mb-1 transition-opacity ${isUpdating ? 'opacity-70' : ''}`}>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { label: 'Balanced', key: 'balanced' as const, hint: 'Typical' },
                  { label: 'Online heavy', key: 'online' as const, hint: 'Digital' },
                  { label: 'Essentials', key: 'essentials' as const, hint: 'Daily' },
                  { label: 'Fashion', key: 'fashion' as const, hint: 'Style' },
                  { label: 'Minimal', key: 'minimal' as const, hint: 'Light' },
                ].map((p) => (
                  <button 
                    key={p.key} 
                    onClick={() => applyPreset(p.key)} 
                    className="btn btn-secondary text-sm py-2 active:scale-[0.985] transition-all flex flex-col items-center"
                    title={`Apply ${p.hint.toLowerCase()} spending pattern`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[10px] text-[#94a3b8] -mt-0.5">{p.hint}</span>
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

      {/* SPENDING EDITOR — premium inputs + live projections */}
      <div className="max-w-7xl mx-auto px-5 pt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-semibold text-lg text-[#0f172a] flex items-center gap-2">
              Edit your monthly spending
              <span className="tooltip inline-block align-middle" title="">
                <HelpCircle className="w-3.5 h-3.5 text-[#94a3b8] cursor-help" />
                <div className="tooltip-content text-left whitespace-normal w-52 -ml-20">
                  Rewards that match your real life mean more value from the same spending.
                </div>
              </span>
            </div>
            <div className="text-xs text-[#64748b]">All values in USD. Everything updates live — no submit needed.</div>
          </div>
          <button onClick={resetToSample} className="btn btn-ghost text-sm md:hidden">
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        <div className={`card p-5 md:p-6 transition-opacity ${isUpdating ? 'opacity-90' : ''}`}>
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Editor groups — takes 3 cols on lg */}
            <div className="lg:col-span-3 space-y-6">
              {/* Everyday */}
              <div>
                <div className="input-label mb-2 flex items-center gap-1.5">
                  Everyday essentials
                  <span className="tooltip relative">
                    <Info className="w-3 h-3 text-[#94a3b8]" />
                    <div className="tooltip-content text-left w-44 -ml-16">Your biggest buckets drive the biggest reward deltas.</div>
                  </span>
                </div>
                <div className="space-y-4">
                  {(['groceries', 'gas', 'dining'] as const).map((key) => (
                    <div key={key} className="spending-row">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-20 text-sm capitalize text-[#475569]">{key}</div>
                        <div className="flex-1 flex items-center gap-1.5">
                          <button 
                            onClick={() => stepSpending(key, -10)} 
                            className="w-6 h-6 rounded-lg border border-[#e2e8f0] hover:bg-[#f1f5f9] active:bg-[#e2e8f0] flex items-center justify-center transition"
                            aria-label={`Decrease ${key}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex-1 relative">
                            <div className="absolute left-3 top-1/2 -mt-1.5 text-[#94a3b8] text-sm">$</div>
                            <input
                              type="number"
                              className="input pl-7 tabular-nums py-1.5"
                              value={spending[key]}
                              onChange={(e) => updateSpending(key, parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <button 
                            onClick={() => stepSpending(key, 10)} 
                            className="w-6 h-6 rounded-lg border border-[#e2e8f0] hover:bg-[#f1f5f9] active:bg-[#e2e8f0] flex items-center justify-center transition"
                            aria-label={`Increase ${key}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="w-9 text-right text-xs text-[#94a3b8] tabular-nums">/mo</div>
                      </div>
                      <input 
                        type="range" 
                        min={0} 
                        max={600} 
                        step={5} 
                        value={spending[key]} 
                        onChange={(e) => updateSpending(key, parseInt(e.target.value))}
                        className="w-full accent-[#0f766e] cursor-pointer" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Shopping */}
              <div>
                <div className="input-label mb-2 flex items-center gap-1.5">Shopping &amp; other</div>
                <div className="space-y-4">
                  {(['online', 'retail', 'general'] as const).map((key) => (
                    <div key={key} className="spending-row">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-20 text-sm capitalize text-[#475569]">{key}</div>
                        <div className="flex-1 flex items-center gap-1.5">
                          <button 
                            onClick={() => stepSpending(key, -5)} 
                            className="w-6 h-6 rounded-lg border border-[#e2e8f0] hover:bg-[#f1f5f9] active:bg-[#e2e8f0] flex items-center justify-center transition"
                            aria-label={`Decrease ${key}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex-1 relative">
                            <div className="absolute left-3 top-1/2 -mt-1.5 text-[#94a3b8] text-sm">$</div>
                            <input
                              type="number"
                              className="input pl-7 tabular-nums py-1.5"
                              value={spending[key]}
                              onChange={(e) => updateSpending(key, parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <button 
                            onClick={() => stepSpending(key, 5)} 
                            className="w-6 h-6 rounded-lg border border-[#e2e8f0] hover:bg-[#f1f5f9] active:bg-[#e2e8f0] flex items-center justify-center transition"
                            aria-label={`Increase ${key}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="w-9 text-right text-xs text-[#94a3b8] tabular-nums">/mo</div>
                      </div>
                      <input 
                        type="range" 
                        min={0} 
                        max={500} 
                        step={5} 
                        value={spending[key]} 
                        onChange={(e) => updateSpending(key, parseInt(e.target.value))}
                        className="w-full accent-[#0f766e] cursor-pointer" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Specific Stores — compact with controls */}
              <div>
                <div className="input-label mb-2">Specific stores you shop at (higher rewards often here)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-3.5">
                  {(
                    [
                      ['amazon', 'Amazon'], ['bestbuy', 'Best Buy'], ['walmart', 'Walmart'],
                      ['sams', "Sam's Club"], ['lowes', "Lowe's"], ['verizon', 'Verizon'],
                      ['gap', 'Gap brands'], ['kohl', "Kohl's"], ['ulta', 'Ulta Beauty'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="spending-row">
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 shrink-0 text-xs text-[#475569] truncate">{label}</div>
                        <button onClick={() => stepSpending(key, -5)} className="text-[#94a3b8] hover:text-[#475569] active:scale-90 transition w-5 h-5 flex items-center justify-center border rounded border-[#e2e8f0]">-</button>
                        <div className="flex-1 relative min-w-0">
                          <div className="absolute left-2.5 top-1/2 -mt-[5px] text-[#94a3b8] text-xs">$</div>
                          <input
                            type="number"
                            className="input pl-6 text-xs py-[5px] tabular-nums"
                            value={spending[key]}
                            onChange={(e) => updateSpending(key, parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <button onClick={() => stepSpending(key, 5)} className="text-[#94a3b8] hover:text-[#475569] active:scale-90 transition w-5 h-5 flex items-center justify-center border rounded border-[#e2e8f0]">+</button>
                        <input 
                          type="range" min={0} max={250} step={5} value={spending[key]} 
                          onChange={(e) => updateSpending(key, parseInt(e.target.value))}
                          className="w-16 accent-[#0f766e] cursor-pointer hidden md:block" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LIVE PROJECTIONS PANEL — new, right side */}
            <div className="lg:col-span-2 lg:pl-2">
              <div className="input-label mb-2.5 flex items-center gap-2">
                Live projections
                <span className="text-[10px] px-1.5 py-px rounded bg-[#ccfbf1] text-[#0f766e]">instant</span>
              </div>
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 space-y-3">
                {top3.slice(0, 3).map((card, idx) => {
                  const pctOfMax = top3[0].projected > 0 ? Math.round((card.projected / top3[0].projected) * 100) : 100;
                  return (
                    <div key={idx} className="group">
                      <div className="flex justify-between text-sm mb-1">
                        <div className="font-medium text-[#0f172a] truncate pr-2">{card.name}</div>
                        <div className="tabular-nums font-semibold text-[#0f766e] shrink-0">{formatCurrency(card.projected)}</div>
                      </div>
                      <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div className="h-1.5 bg-[#0f766e] rounded-full transition-all" style={{ width: `${pctOfMax}%` }} />
                      </div>
                      <div className="text-[10px] text-[#64748b] mt-0.5">{idx === 0 ? 'Best match' : idx === 1 ? 'Strong #2' : 'Close #3'} for your profile</div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t text-xs text-[#64748b] flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Projected annual rewards based on your current inputs
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[#64748b] leading-snug">
                Tip: Small shifts in high-rate categories create outsized differences in returns.
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <div className="font-medium text-[#0f172a]">Total monthly spend: <span className="tabular-nums">{formatCurrency(totalMonthly)}</span></div>
            <div className="text-[#64748b]">• All recommendations &amp; projections update instantly as you slide or type</div>
          </div>
        </div>
      </div>

      {/* YOUR RECOMMENDATIONS — clearer reasons + comparison */}
      <div id="recommend" className="max-w-7xl mx-auto px-5 pt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#0f766e]" /> Your Top Recommendations
            </div>
            <p className="text-[#64748b]">Ranked by projected annual rewards for your exact spending. Tap any card for full breakdown.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowCompare(!showCompare)} 
              className="btn btn-secondary text-xs py-1.5 px-3 hidden sm:flex items-center"
            >
              {showCompare ? 'Hide' : 'Compare'} top 3
            </button>
            <div className="text-xs px-3 py-1 rounded-full bg-white border border-[#e2e8f0] text-[#64748b] hidden sm:flex items-center gap-1.5">
              Live • Updates as you edit
              {isUpdating && <span className="text-[#0f766e] animate-pulse">updating…</span>}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {top3.map((card, index) => {
            const reason = getRecommendationReason(card, spending);
            const isTop = index === 0;
            return (
              <div 
                key={card.id} 
                className={`card p-5 flex flex-col transition-all ${isTop ? 'ring-1 ring-[#0f766e]/70 shadow-md' : ''}`}
              >
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
                  <div className="text-[#334155] leading-snug">{reason}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => openCardDetail(card)} className="btn btn-secondary flex-1 text-sm py-2 active:scale-[0.985]">
                      View full details &amp; table
                    </button>
                    {isTop && <div className="badge badge-emerald px-2.5 py-1 text-[10px]">BEST FIT</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison view — clear side-by-side */}
        {showCompare && (
          <div className="mt-4 card p-4 border-[#e2e8f0] bg-[#fafbfc]">
            <div className="text-sm font-semibold mb-2 flex items-center gap-2 text-[#0f172a]">
              Head-to-head: Top 3 for your spending
              <button onClick={() => setShowCompare(false)} className="ml-auto text-xs text-[#64748b]">close</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-[#64748b] border-b">
                    <th className="pb-2 pr-3 font-normal">Card</th>
                    <th className="pb-2 pr-3 font-normal text-right">Annual projection</th>
                    <th className="pb-2 font-normal">Top earning areas (your spend × rate)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {top3.map((c, i) => {
                    const contribs = getTopContribs(c, spending);
                    return (
                      <tr key={i} className="hover:bg-white/60">
                        <td className="py-2.5 pr-3 font-medium text-[#0f172a]">{c.name}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums font-semibold text-[#0f766e]">{formatCurrency(c.projected)}</td>
                        <td className="py-2.5 text-[#475569]">
                          {contribs.map((ct, j) => (
                            <span key={j} className="inline-block mr-3">
                              {ct.cat}: ${ct.amt} @ {Math.round(ct.rate * 100)}% = ${ct.contrib}/mo
                            </span>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-[11px] text-[#64748b]">Differences come from how closely each card’s highest rates align with where you actually spend.</div>
          </div>
        )}

        <div className="mt-3 text-xs text-[#64748b] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> 
          Numbers calculated directly from your spending × published card rates. All cards shown are $0 annual fee.
        </div>
      </div>

      {/* EXPLORE ALL CARDS — better responsive grid + UX */}
      <div id="explore" className="max-w-7xl mx-auto px-5 pt-11">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="section-title">Explore All Cards</div>
            <div className="text-[#64748b]">Search, filter, and compare every Synchrony option. {displayedCards.length} shown.</div>
          </div>

          {/* Controls — premium UX */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#94a3b8]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, perks, stores..."
                className="input pl-10 py-2 text-sm focus:ring-1 focus:ring-[#0f766e]/30"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-[#64748b] hover:text-[#334155] transition">
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
                  className={`btn text-sm py-1.5 px-3.5 active:scale-[0.985] transition ${filter === f.val ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 items-center">
              <select 
                value={sortMode} 
                onChange={(e) => setSortMode(e.target.value as any)}
                className="input py-2 text-sm w-auto sm:w-44 focus:ring-1 focus:ring-[#0f766e]/30"
              >
                <option value="recommended">Sort: Best for you</option>
                <option value="name">Sort: A–Z</option>
                <option value="bonus">Sort: Highest bonus rate</option>
              </select>
              {(searchTerm || filter !== 'all' || sortMode !== 'recommended') && (
                <button 
                  onClick={() => { setSearchTerm(''); setFilter('all'); setSortMode('recommended'); }} 
                  className="btn btn-ghost text-xs px-2 py-1.5 text-[#64748b] hover:text-[#334155]"
                  title="Clear all filters"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cards Grid — improved responsiveness, premium card hovers */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 transition-opacity ${isUpdating ? 'opacity-80' : ''}`}>
          {displayedCards.map((card) => {
            const annual = card.projected;
            return (
              <div 
                key={card.id} 
                className="card p-5 group flex flex-col hover:-translate-y-px active:scale-[0.995] transition-all duration-150 cursor-pointer"
                onClick={() => openCardDetail(card)}
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="font-semibold leading-tight text-[#0f172a] text-[17px] pr-1 group-hover:text-[#0f766e] transition-colors">{card.name}</div>
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

                <div className="pt-4 mt-4 border-t flex gap-2" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openCardDetail(card); }} 
                    className="btn btn-secondary flex-1 text-sm py-2 active:scale-[0.985]"
                  >
                    Details &amp; breakdown
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('recommend')?.scrollIntoView({ behavior: 'smooth' });
                    }} 
                    className="btn btn-ghost text-sm py-2"
                    title="See in your top recommendations"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {displayedCards.length === 0 && (
          <div className="text-center py-10 text-[#64748b]">
            No cards match. <button className="underline hover:no-underline" onClick={() => {setSearchTerm(''); setFilter('all');}}>Clear search &amp; filters</button>
          </div>
        )}
      </div>

      {/* INSIGHTS + FINANCIAL LITERACY — subtle, insightful */}
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
              The cards that quietly win are the ones aligned with the spending you already do — no lifestyle changes required.
            </div>
          </div>

          <div className="lg:col-span-2 card p-6 bg-[#f8fafc] border-[#e2e8f0]">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Why $0-fee cards matter
            </div>
            <div className="text-sm leading-relaxed text-[#475569]">
              Every card here has <span className="font-medium text-[#0f172a]">no annual fee</span>. 
              100% of rewards stay with you. Excellent building-credit options via responsible everyday use.
            </div>
            <div className="mt-4 text-xs bg-white rounded-xl p-3 border border-[#e2e8f0]">
              The best card for you is the one whose highest rates line up with where you already spend — not the one with the flashiest headline rate.
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
                <div className="mt-3 text-[10px] text-[#94a3b8]">This is a simulated flow — no data is actually sent</div>
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

      {/* CARD DETAIL MODAL — full category-by-category table + polished details */}
      {selectedCard && (() => {
        const breakdown = getBreakdown(selectedCard);
        const totals = getBreakdownTotals(breakdown);
        const projected = getCardProjected(selectedCard, spending);
        return (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-start justify-center pt-8 md:pt-12 p-4" onClick={closeCardDetail}>
            <div className="modal bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-2xl tracking-tight text-[#0f172a]">{selectedCard.name}</div>
                    <div className="flex gap-2 mt-1">
                      <span className="badge badge-teal">{selectedCard.type === 'store' ? 'Store Card (PLCC)' : 'Dual Card'}</span>
                      <span className="badge badge-emerald">$0 annual fee</span>
                    </div>
                  </div>
                  <button onClick={closeCardDetail} className="text-[#64748b] mt-1"><X className="w-5 h-5" /></button>
                </div>

                <div className="mt-3 text-[#475569]">{selectedCard.description}</div>

                <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#f8fafc] to-white border border-[#e2e8f0] px-5 py-4">
                  <div className="uppercase text-[10px] tracking-[1.5px] text-[#64748b] mb-0.5">Your projected annual rewards</div>
                  <div className="text-5xl font-semibold tabular-nums tracking-[-2px] text-[#0f766e]">
                    {formatCurrency(projected)}
                  </div>
                  <div className="text-xs text-[#64748b] mt-0.5">Based on the spending profile above • updates live</div>
                </div>
              </div>

              {/* FULL CATEGORY TABLE */}
              <div className="border-t px-6 py-5 bg-white">
                <div className="font-semibold text-sm mb-3 flex items-baseline gap-2 text-[#0f172a]">
                  Category-by-category breakdown
                  <span className="text-[10px] font-normal text-[#94a3b8]">all categories shown</span>
                </div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-[#64748b] text-xs border-b border-[#e2e8f0]">
                        <th className="pb-2 pl-1 font-medium">Category</th>
                        <th className="pb-2 font-medium text-right">Your spend/mo</th>
                        <th className="pb-2 font-medium text-right">Rate on this card</th>
                        <th className="pb-2 font-medium text-right">Monthly earned</th>
                        <th className="pb-2 pr-1 font-medium text-right">Annual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {breakdown.map((row, i) => {
                        const isBonus = row.rate > selectedCard.baseRate;
                        return (
                          <tr key={i} className="hover:bg-[#f8fafc]/60">
                            <td className="py-2 pl-1 capitalize text-[#334155] font-medium">{row.cat}</td>
                            <td className="py-2 tabular-nums text-right text-[#475569]">{formatCurrency(row.amount)}</td>
                            <td className="py-2 tabular-nums text-right">
                              <span className={`${isBonus ? 'font-semibold text-[#0f766e]' : 'text-[#64748b]'}`}>
                                {formatPercent(row.rate)}
                              </span>
                              {isBonus && <span className="ml-1 text-[10px] text-[#0f766e]">★</span>}
                            </td>
                            <td className="py-2 tabular-nums text-right font-medium text-[#0f172a]">${row.monthly}</td>
                            <td className="py-2 pr-1 tabular-nums text-right text-[#64748b]">${row.annual}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold bg-[#f8fafc]">
                        <td className="py-2.5 pl-1 text-[#0f172a]">Total</td>
                        <td className="py-2.5 text-right tabular-nums text-[#475569]">{formatCurrency(totalMonthly)}</td>
                        <td className="py-2.5"></td>
                        <td className="py-2.5 text-right tabular-nums text-[#0f766e] font-semibold">${totals.monthly}</td>
                        <td className="py-2.5 pr-1 text-right tabular-nums text-[#0f766e] text-base">${totals.annual}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="text-[11px] mt-2.5 text-[#64748b]">Base rate applies to categories without a specific bonus. Store &amp; category rates override it automatically.</div>
              </div>

              <div className="px-6 py-4 border-t bg-[#f8fafc]">
                <div className="text-xs font-semibold mb-1.5 tracking-wide text-[#334155]">Key perks</div>
                <ul className="grid gap-y-1 text-sm">
                  {selectedCard.perks.map((p, idx) => (
                    <li key={idx} className="flex gap-2 text-[#334155]"><Check className="mt-1 w-4 h-4 text-[#0f766e] shrink-0" />{p}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 border-t flex gap-3 bg-white">
                <button onClick={closeCardDetail} className="btn btn-secondary flex-1">Close</button>
                <button 
                  onClick={() => {
                    // quick action: highlight this card in recs
                    closeCardDetail();
                    setTimeout(() => document.getElementById('recommend')?.scrollIntoView({ behavior: 'smooth' }), 80);
                  }} 
                  className="btn btn-primary flex-1"
                >
                  See in recommendations
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
