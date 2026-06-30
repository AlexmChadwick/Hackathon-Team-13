import { useState, useMemo } from 'react';
import { 
  CreditCard, Wallet, TrendingUp, Link2, Search, X, Check, RefreshCw, 
  Info, ArrowRight, Star, Users 
} from 'lucide-react';
import { CARDS, type Card } from './data/synchronyCards';

// Types (Card imported from ./data/synchronyCards)

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
  jcpenney: number;
  ashley: number;
  ae: number;
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
  jcpenney: 20,
  ashley: 25,
  ae: 30,
};

// CARDS imported from ./data/synchronyCards (15 researched Synchrony PLCC / Dual cards)

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

// Generate smart reason text
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
    lowes: "Lowe's", verizon: 'Verizon', gap: 'Gap/Old Navy', kohl: "Kohl's", ulta: 'Ulta Beauty',
    jcpenney: 'JCPenney', ashley: 'Ashley Furniture', ae: 'American Eagle',
    groceries: 'groceries', gas: 'gas', dining: 'dining out', online: 'online shopping', 
    retail: 'retail', general: 'everyday purchases',
  };

  const label = catLabels[bestCategory] || 'your spending';
  const annualFromTop = Math.round(bestContribution * 12);

  if (bestRate >= 0.04) {
    return `Earn ${Math.round(bestRate * 100)}% on your $${spending[bestCategory as keyof Spending]}/mo at ${label} → ~$${annualFromTop}/yr`;
  }
  if (card.id === 'premier') {
    return `Simple 2% flat rate on all spending adds up fast — no categories needed.`;
  }
  return `Strong match on ${label} (${Math.round(bestRate * 100)}%) contributing ~$${annualFromTop}/year.`;
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

  // Live calculations
  const totalMonthly = useMemo(() => {
    return Object.values(spending).reduce((sum, v) => sum + v, 0);
  }, [spending]);

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

    // Sort
    if (sortMode === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'bonus') {
      result.sort((a, b) => {
        const maxA = Math.max(a.baseRate, ...Object.values(a.storeRates), ...(a.categoryRates ? Object.values(a.categoryRates) : []));
        const maxB = Math.max(b.baseRate, ...Object.values(b.storeRates), ...(b.categoryRates ? Object.values(b.categoryRates) : []));
        return maxB - maxA;
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
      jcpenney: 'JCPenney', ashley: 'Ashley', ae: 'AEO',
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
      newSpending = { ...DEFAULT_SPENDING, amazon: 280, online: 310, bestbuy: 90, gap: 55, ulta: 40, groceries: 240, dining: 130, ae: 45 };
    } else if (preset === 'essentials') {
      newSpending = { ...DEFAULT_SPENDING, groceries: 420, walmart: 120, gas: 160, sams: 95, dining: 110 };
    } else if (preset === 'minimal') {
      newSpending = {
        groceries: 200, gas: 70, dining: 90, online: 120, retail: 80, general: 55,
        amazon: 70, bestbuy: 25, walmart: 55, sams: 25, lowes: 15, verizon: 35, gap: 15, kohl: 15, ulta: 10,
        jcpenney: 10, ashley: 15, ae: 15,
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

  // Compute breakdown for modal
  const getBreakdown = (card: Card) => {
    const entries = Object.entries(spending) as [keyof Spending, number][];
    return entries
      .map(([cat, amt]) => {
        let rate = card.baseRate;
        if (card.storeRates[cat]) rate = card.storeRates[cat];
        else if (card.categoryRates?.[cat]) rate = card.categoryRates[cat];
        return {
          cat,
          amount: amt,
          rate,
          monthly: Math.round(amt * rate),
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
            Connect how you spend. Get instant, personalized recommendations from 15 researched Synchrony cards.
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
                    ['jcpenney', 'JCPenney'], ['ashley', 'Ashley'], ['ae', 'AEO'],
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
            const reason = getRecommendationReason(card, spending);
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
                  {formatCurrency(getCardProjected(selectedCard, spending))}
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
