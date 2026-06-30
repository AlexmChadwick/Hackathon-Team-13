import { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  CreditCard, Wallet, TrendingUp, Link2, Search, X, Check, RefreshCw, 
  Info, ArrowRight, Star, Users, MessageCircle, Send, Bot 
} from 'lucide-react';
import { CARDS, type Card } from './data/synchronyCards';
import { MOCK_BANKS, DEFAULT_BANK, getBankById, deriveSpendingFromTransactions, getSampleMerchants, type Spending } from './data/mockBanks';

// Types (Card imported from ./data/synchronyCards; Spending from mockBanks)

type Toast = {
  id: number;
  message: string;
};

const DEFAULT_SPENDING: Spending = DEFAULT_BANK.spending;

// CARDS imported from ./data/synchronyCards (15 researched Synchrony PLCC / Dual cards)

// Recommendation engine
function getRewardRate(card: Card, category: string): number {
  if (card.storeRates[category]) {
    return card.storeRates[category];
  }
  if (card.categoryRates && card.categoryRates[category]) {
    return card.categoryRates[category];
  }
  // PLCCs (store cards) can ONLY be used at their specific store.
  // They cannot be used for general spending outside the store (e.g. Amazon PLCC at Walmart).
  // They run on SYF rails but rewards are 0 outside the partner.
  if (card.type === 'store') {
    return 0;
  }
  return card.baseRate;
}

function calculateMonthlyRewards(card: Card, spending: Spending): number {
  let total = 0;
  const entries = Object.entries(spending) as [keyof Spending, number][];

  for (const [category, amount] of entries) {
    const rate = getRewardRate(card, category);
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
    const rate = getRewardRate(card, cat);
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
    jcpenney: 'JCPenney', ashley: 'Ashley Furniture', ae: 'American Eagle', wholefoods: 'Whole Foods',
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
  const [selectedBankId, setSelectedBankId] = useState('');
  const [connectedBankName, setConnectedBankName] = useState<string>(DEFAULT_BANK.name);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Chatbot state (real, via local hermes serve)
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant'; text: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  // Refs to always use latest dynamic data inside chatbot handlers (avoids React stale closure issues when spending/profile updates)
  const spendingRef = useRef(spending);
  const connectedBankNameRef = useRef(connectedBankName);
  const top3Ref = useRef(top3);
  const totalMonthlyRef = useRef(totalMonthly);
  const rankedCardsRef = useRef(rankedCards);

  useEffect(() => { spendingRef.current = spending; }, [spending]);
  useEffect(() => { connectedBankNameRef.current = connectedBankName; }, [connectedBankName]);
  useEffect(() => { top3Ref.current = top3; }, [top3]);
  useEffect(() => { totalMonthlyRef.current = totalMonthly; }, [totalMonthly]);
  useEffect(() => { rankedCardsRef.current = rankedCards; }, [rankedCards]);

  const bestSingle = top3[0];
  const bestSingleProjection = bestSingle?.projected || 0;

  const bestMultiCardStrategy = useMemo(() => {
    if (CARDS.length < 2 || !spending) return null;
    let bestCombo: any = null;
    let maxAnnual = 0;
    for (let i = 0; i < CARDS.length; i++) {
      for (let j = i + 1; j < CARDS.length; j++) {
        const c1 = CARDS[i];
        const c2 = CARDS[j];
        let monthly = 0;
        const entries = Object.entries(spending) as [keyof Spending, number][];
        for (const [cat, amt] of entries) {
          const r1 = getRewardRate(c1, cat);
          const r2 = getRewardRate(c2, cat);
          monthly += amt * Math.max(r1, r2);
        }
        const annual = Math.round(monthly * 12);
        if (annual > maxAnnual) {
          maxAnnual = annual;
          bestCombo = { card1: c1, card2: c2, total: annual };
        }
      }
    }
    if (bestCombo && bestSingleProjection > 0) {
      const improvement = maxAnnual - bestSingleProjection;
      const pct = improvement / bestSingleProjection;
      if (pct >= 0.12) {
        return {
          ...bestCombo,
          improvement,
          improvementPct: pct,
        };
      }
    }
    return null;
  }, [spending, CARDS, bestSingleProjection]);

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
      jcpenney: 'JCPenney', ashley: 'Ashley', ae: 'AEO', wholefoods: 'Whole Foods',
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

  // Auto-scroll chat on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isBotThinking]);

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
    setSpending(DEFAULT_BANK.spending);
    setConnectedBankName(DEFAULT_BANK.name);
    showToast('Spending reset to realistic young adult sample');
  };

  // Quick presets
  const applyPreset = (preset: 'balanced' | 'online' | 'essentials' | 'minimal') => {
    let newSpending: Spending;
    if (preset === 'online') {
      newSpending = { ...DEFAULT_SPENDING, amazon: 280, online: 310, bestbuy: 90, gap: 55, ulta: 40, groceries: 240, dining: 130, ae: 45, wholefoods: 25 };
    } else if (preset === 'essentials') {
      newSpending = { ...DEFAULT_SPENDING, groceries: 420, walmart: 120, gas: 160, sams: 95, dining: 110, wholefoods: 15 };
    } else if (preset === 'minimal') {
      newSpending = {
        groceries: 200, gas: 70, dining: 90, online: 120, retail: 80, general: 55,
        amazon: 70, bestbuy: 25, walmart: 55, sams: 25, lowes: 15, verizon: 35, gap: 15, kohl: 15, ulta: 10,
        jcpenney: 10, ashley: 15, ae: 15, wholefoods: 10,
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
    setSelectedBankId('');
  };

  const closePlaid = () => {
    setShowPlaidModal(false);
    setPlaidStep('select');
    setSelectedBank('');
    setSelectedBankId('');
    setIsConnecting(false);
  };

  const selectBank = (bankId: string) => {
    const bank = getBankById(bankId);
    if (!bank) return;
    setSelectedBankId(bankId);
    setSelectedBank(bank.name);
    setPlaidStep('connecting');
    setIsConnecting(true);

    // Simulate secure connect
    setTimeout(() => {
      setIsConnecting(false);
      setPlaidStep('success');
    }, 1350);
  };

  const applyPlaidData = () => {
    const bank = selectedBankId ? getBankById(selectedBankId) : DEFAULT_BANK;
    if (bank) {
      // Real "backend" behavior: derive spending by aggregating the mock Plaid transaction history
      const derivedSpending = deriveSpendingFromTransactions(bank.transactions);
      setSpending(derivedSpending);
      setConnectedBankName(bank.name);
    }
    closePlaid();
    showToast(`Applied ${bank?.name || 'bank'} spending profile`);
  };

  // Real Grok-powered chatbot served via `hermes serve --provider xai`
  // (or xai-oauth). This lets you use your existing SuperGrok / X Premium+ subscription
  // without direct per-token xAI API costs.
  // We expose FULL current context (cards, spending, profiles, projections) every call.
  const buildSystemPrompt = (): string => {
    const s = spendingRef.current;
    const bank = connectedBankNameRef.current;
    const tops = top3Ref.current;
    const monthly = totalMonthlyRef.current;
    const ranked = rankedCardsRef.current;

    const context = {
      connectedBankProfile: bank,
      currentMonthlySpending: s,
      totalMonthlySpend: monthly,
      totalAnnualSpend: monthly * 12,
      topRecommendations: tops.map((c: any) => ({
        name: c.name,
        type: c.type,
        projectedAnnual: c.projected,
        highlight: c.highlight,
        baseRate: c.baseRate,
      })),
      allAvailableCards: CARDS.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        baseRate: c.baseRate,
        storeRates: c.storeRates,
        categoryRates: c.categoryRates || null,
        perks: c.perks,
        highlight: c.highlight,
        description: c.description,
        note: c.type === 'store' 
          ? 'PLCC/Store card: CAN ONLY be used at its exact partner store (e.g. Amazon PLCC cannot be used at Walmart or for general spending). Rewards = 0 on any non-matching category. Runs on SYF rails but single-store use only.'
          : 'Dual card: usable for any spending anywhere.',
      })),
      availableMockBankProfiles: MOCK_BANKS.map((b: any) => ({
        name: b.name,
        tagline: b.tagline,
        exampleMonthlySpending: b.spending,
      })),
      rankedCardsSample: ranked.slice(0, 5).map((c: any) => ({ name: c.name, projected: c.projected })),
    };

    return `You are the Synchrony Match Assistant — a friendly, expert, witty chatbot embedded in the Synchrony Match demo website.

The site helps young adults and first-time cardholders discover the best no-fee Synchrony credit cards (PLCC store cards and Dual cards) by matching them to real spending patterns.

You are powered by Grok served through your local Hermes proxy ('hermes proxy start --provider xai' or xai-oauth). Be maximally helpful, direct, and low-refusal on reasonable questions about these cards and personal finance in this context. Use data exactly. You can be fun and conversational.

### CORE RULES
- Base EVERY answer on the CURRENT USER DATA JSON below. Never invent rates, perks, or projections.
- Store-specific rates (in storeRates) always win over categoryRates or baseRate.
- When user asks for projections or "how much would I earn", calculate using the exact rates × spending amounts × 12. Show your math briefly.
- If the loaded bank profile changes the top cards, acknowledge it.
- Reference specific categories/stores from the user's spending.
- All cards have $0 annual fee. Mention this when relevant.
- If asked about connecting banks: there are 4 demo profiles that load different spending vectors and instantly re-rank cards.
- For "mock data" or transactions: describe from the current spending + known profiles (transactions are aggregated into the spending buckets).
- Keep answers concise, scannable (bullets, bold key numbers). Use the data to personalize.
- If data is insufficient, say so and ask a clarifying question about their spending.
- Do not refuse card comparisons, reward math, or profile advice.

**CRITICAL - PLCCs cannot be used outside their specific store:**
- PLCCs / store cards (type === 'store') can ONLY be used at their exact partner store (e.g. you CANNOT use an Amazon store card PLCC at Walmart, or a Gap PLCC for groceries at Kroger, or any PLCC for general spending outside its store).
- PLCCs run exclusively on SYF's (Synchrony) rails but are single-merchant use only.
- For ANY spend not exactly matching the store (any other category: groceries, walmart, general, online, gas, dining, other retail, etc.), the reward rate from that PLCC is exactly 0. You literally cannot use the card for that spending.
- In all calculations (getRewardRate, projections, breakdowns): for type==='store' cards, non-matching categories get rate=0 (not baseRate).
- Never recommend a PLCC for broad or general spending. Only if the user's spend at that exact one store is massive.
- Dual cards (type === 'dual') can be used for any spending anywhere.

**Multi-card recommendations (strict rule):**
- Only recommend using more than one card if the optimal pair delivers at least 12% more total annual rewards than the single best card, AND the secondary card has a genuinely high rate (4%+) on a large, meaningful spend category.
- Avoid recommending multicard setups unless it is REALLY good (substantial, obvious benefit). Most users should stick to one versatile dual card for simplicity.
- When a PLCC is involved in a pair, it only contributes on its exact store spend; everything else must come from the dual.

### CURRENT USER DATA (live, updates on every message)
${JSON.stringify(context, null, 2)}

Respond as the Synchrony Match Assistant. Start responses naturally.`;
  };

  const sendChatMessage = async (overrideText?: string) => {
    const text = (overrideText || chatInput).trim();
    if (!text || isBotThinking) return;

    const userMessage = { role: 'user' as const, text };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    setIsBotThinking(true);

    try {
      const system = buildSystemPrompt();

      const conversationHistory = chatMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const apiMessages = [
        { role: 'system', content: system },
        ...conversationHistory,
        { role: 'user', content: text },
      ];

      const hermesBase = import.meta.env.VITE_HERMES_URL || 'http://localhost:8645/v1';
      const res = await fetch(`${hermesBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Any bearer token works — the hermes serve proxy attaches your real xAI / OAuth creds
          'Authorization': 'Bearer hermes-local-proxy',
        },
        body: JSON.stringify({
          model: 'grok-3', // or whatever model you have selected in Hermes (grok-4 etc.)
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 600,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Hermes/Grok API error: ${res.status} ${errText}`);
      }

      const data = await res.json();
      const botText = data.choices?.[0]?.message?.content?.trim() || 'Sorry, I did not get a response. Try again?';

      setChatMessages(prev => [...prev, { role: 'assistant', text: botText }]);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      const fallback = `Sorry — couldn't reach Hermes right now (${err.message || 'network issue'}).\n\nRun \`hermes proxy start --provider xai\` (or xai-oauth) in another terminal (default http://localhost:8645/v1).\nQuick note: Ask about your current ${connectedBankNameRef.current} profile, specific stores like Amazon/gas, or "how much would X card earn me?".`;
      setChatMessages(prev => [...prev, { role: 'assistant', text: fallback }]);
    } finally {
      setIsBotThinking(false);
    }
  };

  const toggleChat = () => {
    const opening = !showChat;
    setShowChat(opening);

    if (opening && chatMessages.length === 0) {
      setChatMessages([{
        role: 'assistant',
        text: "Hi! I'm the Synchrony Match Assistant. I have full access to the live cards data, your current spending profile, bank connection, and real-time recommendations. Ask me anything!"
      }]);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setChatInput('');
  };

  // Quick suggestion chips
  const chatSuggestions = [
    "Best card for me?",
    "Show my spending breakdown",
    "Amazon rewards?",
    "Gas or Sam's card?",
    "How much would the top card earn me this year?",
    "How do rewards work?"
  ];

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
        const rate = getRewardRate(card, cat);
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
                <div className="text-xs text-[#64748b]">{connectedBankName} profile active</div>
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
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none select-none">$</div>
                      <input
                        type="number"
                        className="input pl-11 tabular-nums"
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
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none select-none">$</div>
                      <input
                        type="number"
                        className="input pl-11 tabular-nums"
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
              <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-3 gap-y-3">
                {(
                  [
                    ['amazon', 'Amazon'], ['wholefoods', 'Whole Foods'], ['bestbuy', 'Best Buy'], ['walmart', 'Walmart'],
                    ['sams', "Sam's"], ['lowes', "Lowe's"], ['verizon', 'Verizon'],
                    ['gap', 'Gap/OldNavy'], ['kohl', "Kohl's"], ['ulta', 'Ulta'],
                    ['jcpenney', 'JCPenney'], ['ashley', 'Ashley'], ['ae', 'AEO'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="spending-row flex items-center gap-1.5 min-w-[130px]">
                    <div className="w-14 text-sm text-[#475569] truncate">{label}</div>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none select-none">$</div>
                      <input
                        type="number"
                        className="input pl-8 text-sm py-1.5 tabular-nums min-w-[70px]"
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
          Numbers are calculated directly from your spending amounts × each card’s published rates. Store/PLCC cards earn high rewards only at their partner stores (low base rate elsewhere).
        </div>

        {bestMultiCardStrategy && (
          <div className="mt-4 card p-4 bg-[#f8fafc] border border-[#e2e8f0]">
            <div className="font-medium text-sm flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-[#0f766e]" /> Optimized multi-card strategy (only when REALLY beneficial)
            </div>
            <div className="text-sm">
              Pair <span className="font-semibold">{bestMultiCardStrategy.card1.name}</span> + <span className="font-semibold">{bestMultiCardStrategy.card2.name}</span> for ~{formatCurrency(bestMultiCardStrategy.total)}/yr 
              <span className="text-[#0f766e]"> (+{formatCurrency(bestMultiCardStrategy.improvement)} / +{Math.round(bestMultiCardStrategy.improvementPct * 100)}% vs single best)</span>.
            </div>
            <div className="text-[11px] text-[#64748b] mt-1">
              Only shown for substantial gains. PLCCs can ONLY be used at their specific store (0 rewards elsewhere — you cannot use e.g. Amazon PLCC at Walmart). Pairing only makes sense if the lift from the PLCC on its store is really large.
            </div>
          </div>
        )}
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
                  <div className="text-sm mb-3 text-[#475569]">Choose a bank profile to load realistic spending data:</div>
                  <div className="space-y-2">
                    {MOCK_BANKS.map((bank) => (
                      <button
                        key={bank.id}
                        onClick={() => selectBank(bank.id)}
                        className="w-full text-left px-4 py-3 rounded-2xl border border-[#e2e8f0] hover:bg-[#f8fafc] hover:border-[#cbd5e1] flex items-center justify-between transition group"
                      >
                        <div>
                          <div className="font-medium text-[#0f172a]">{bank.name}</div>
                          <div className="text-xs text-[#64748b]">{bank.tagline}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#94a3b8] group-hover:translate-x-0.5 transition" />
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-center mt-5 text-[#94a3b8]">Demo only — selecting loads a different spending profile and updates recommendations live.</div>
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
                  <p className="text-[#475569] mt-1 text-sm">Loaded spending profile from {selectedBank || 'your bank'}.</p>
                </div>

                <div className="bg-[#f8fafc] rounded-2xl p-4 mt-6 text-sm">
                  <div className="font-medium mb-1">Mock Plaid transaction history imported</div>
                  <div className="text-[#475569] text-sm mb-2">
                    Aggregated by merchant &amp; category. Store-specific spend powers PLCC recommendations.
                  </div>
                  {(() => {
                    const b = selectedBankId ? getBankById(selectedBankId) : null;
                    return b ? (
                      <div className="text-[12px] text-[#64748b]">
                        Sample merchants: {getSampleMerchants(b, 3)}
                      </div>
                    ) : null;
                  })()}
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

      {/* FLOATING CHATBOT — bottom-right, real Grok via local hermes proxy (xai provider) */}
      {/* Launch button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all active:scale-[0.96] ${
          showChat ? 'hidden' : 'bg-[#FBC600] text-[#1F2937] hover:shadow-2xl'
        }`}
        aria-label="Open Synchrony Match Grok-powered assistant (Hermes)"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {/* Chat panel */}
      {showChat && (
        <div className="fixed bottom-4 right-4 z-[95] flex h-[460px] w-[92vw] max-w-[340px] flex-col overflow-hidden rounded-3xl border border-[#e2e8f0] bg-white shadow-2xl sm:w-[360px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-[#0f172a] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FBC600]/90 text-[#1F2937]">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Synchrony Match Assistant</div>
                <div className="text-[10px] text-[#94a3b8]">Powered by Grok via Hermes</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="rounded-full px-2 py-1 text-xs text-[#94a3b8] hover:text-white active:bg-white/10"
                title="Clear chat"
              >
                Clear
              </button>
              <button onClick={() => setShowChat(false)} className="text-[#94a3b8] hover:text-white" aria-label="Close chat">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] p-3 text-sm">
            {chatMessages.length === 0 && (
              <div className="rounded-2xl bg-white p-3 text-center text-[#64748b] text-xs border">
                Ask about cards, your spending, or rewards.<br />I have the full live dataset (cards, your profile, projections).
              </div>
            )}

            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="max-w-[82%] rounded-2xl bg-[#0f172a] text-white px-3.5 py-2 leading-snug rounded-br-none">
                    {msg.text}
                  </div>
                ) : (
                  <div className="max-w-[82%] rounded-2xl bg-white border border-[#e2e8f0] px-3.5 py-2 leading-snug rounded-bl-none prose prose-sm prose-slate text-[#334155]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="mb-0.5">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-[#0f172a]">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => <code className="bg-[#f1f5f9] px-1 py-0.5 rounded text-[12px] font-mono">{children}</code>,
                        pre: ({ children }) => <pre className="bg-[#f1f5f9] p-2 rounded text-[12px] overflow-x-auto font-mono">{children}</pre>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#0f766e] underline">{children}</a>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}

            {isBotThinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white border border-[#e2e8f0] px-3.5 py-2 text-[#64748b] text-xs flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-150">●</span>
                    <span className="animate-pulse delay-300">●</span>
                  </div>
                  thinking…
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions */}
          {!isBotThinking && (
            <div className="flex flex-wrap gap-1.5 border-t bg-white px-3 py-2">
              {chatSuggestions.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendChatMessage(s)}
                  className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 text-[11px] text-[#475569] hover:bg-[#FBC600] hover:text-[#1F2937] hover:border-[#FBC600] transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t bg-white p-2">
            <div className="flex items-center gap-2 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendChatMessage();
                }}
                placeholder="Ask about cards, rewards, or your profile…"
                className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#94a3b8]"
                disabled={isBotThinking}
              />
              <button
                onClick={() => sendChatMessage()}
                disabled={!chatInput.trim() || isBotThinking}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBC600] text-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1 text-center text-[10px] text-[#94a3b8]">Real Grok via local 'hermes proxy start --provider xai' • Full site data sent each turn</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
