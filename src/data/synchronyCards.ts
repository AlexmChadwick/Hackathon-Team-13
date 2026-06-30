// Synchrony PLCC and Dual cards data (research-backed as of 2026)
// All cards have $0 annual fee. Rates and perks drawn from current Synchrony partner programs.
// Focused on value for young adults and first-time credit builders.

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

export const CARDS: Card[] = [
  {
    id: 'amazon',
    name: 'Amazon Prime Store Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.03,
    storeRates: { amazon: 0.05 },
    perks: [
      '5% back at Amazon & Whole Foods (Prime members)',
      '3% back at Amazon/Whole Foods (non-Prime)',
      'Easy 0% promo financing options',
      'No annual fee — rewards stay yours',
    ],
    highlight: '5% at Amazon (Prime)',
    store: 'Amazon',
    description:
      'Perfect for frequent Amazon and Whole Foods shoppers. Prime members unlock top rewards instantly. Excellent starter card that helps young adults build credit with on-time payments.',
  },
  {
    id: 'bestbuy',
    name: 'Best Buy Credit Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { bestbuy: 0.05 },
    perks: [
      '5% back on all Best Buy purchases (standard credit)',
      'My Best Buy rewards integration',
      '0% promo financing on major purchases',
      'No annual fee',
    ],
    highlight: '5% at Best Buy',
    store: 'Best Buy',
    description:
      'Ideal for tech, gaming, and electronics buyers. Great way for young adults to build credit while earning on big-ticket items with flexible financing.',
  },
  {
    id: 'walmart',
    name: 'OnePay Walmart Card',
    type: 'dual',
    annualFee: 0,
    baseRate: 0.015,
    storeRates: { walmart: 0.05 },
    perks: [
      'Up to 5% cash back at Walmart (Walmart+ members)',
      '3% at Walmart for non-members',
      '1.5% cash back everywhere else',
      'No annual fee, Mastercard acceptance',
    ],
    highlight: 'Up to 5% at Walmart',
    store: 'Walmart',
    description:
      'Everyday essentials powerhouse. High rates on groceries, household goods, and general shopping. Simple rewards that help stretch a young budget while building credit.',
  },
  {
    id: 'sams',
    name: "Sam's Club Mastercard",
    type: 'dual',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { sams: 0.03 },
    categoryRates: { gas: 0.05, dining: 0.03 },
    perks: [
      '3% at Sam\'s Club (up to 5% for Plus members)',
      '5% back on gas anywhere (up to $6,000/yr)',
      '3% on dining and takeout',
      'No annual fee, Sam\'s Cash rewards',
    ],
    highlight: '3% Sam\'s + 5% gas',
    store: "Sam's Club",
    description:
      'Strong choice for bulk buyers and drivers. Tiered rewards on warehouse clubs plus gas and dining bonuses. Responsible use builds credit fast.',
  },
  {
    id: 'lowes',
    name: "Lowe's Advantage Card",
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { lowes: 0.05 },
    perks: [
      '5% off eligible purchases at Lowe\'s',
      'Special 0% financing offers on projects',
      'No annual fee',
      'MyLowe\'s rewards synergy',
    ],
    highlight: '5% at Lowe\'s',
    store: "Lowe's",
    description:
      'Best for home improvement and DIY. Every project earns serious value. Great first card for young adults setting up their first place.',
  },
  {
    id: 'verizon',
    name: 'Verizon Visa Card',
    type: 'dual',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { verizon: 0.04 },
    categoryRates: { gas: 0.04, dining: 0.04, groceries: 0.04 },
    perks: [
      '4% on Verizon purchases (excl. bill pay)',
      '4% at gas, groceries, dining & EV charging',
      '1% on all other purchases',
      'Redeem for Verizon bills/devices',
    ],
    highlight: '4% Verizon + 4% gas/dining/grocery',
    store: 'Verizon',
    description:
      'Flexible dual card if you have a Verizon bill. Strong category bonuses on everyday gas, groceries and dining. Excellent credit-building option with real utility.',
  },
  {
    id: 'premier',
    name: 'Synchrony Premier World Mastercard',
    type: 'dual',
    annualFee: 0,
    baseRate: 0.02,
    storeRates: {},
    perks: [
      '2% cash back on everything — unlimited',
      'No foreign transaction fees',
      'Premium Mastercard concierge & travel benefits',
      'No annual fee',
    ],
    highlight: '2% everywhere flat',
    description:
      'The simple powerhouse. Best flat-rate card with no categories to track. Perfect for beginners and anyone who wants straightforward rewards while building credit.',
  },
  {
    id: 'gap',
    name: 'Gap Inc. Credit Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { gap: 0.05 },
    perks: [
      '5% back at Gap, Old Navy, Banana Republic, Athleta',
      'Extra 10-30% off first purchase offers',
      'No annual fee',
      'Encore rewards program perks',
    ],
    highlight: '5% at Gap brands',
    store: 'Gap',
    description:
      'Fashion favorite for young adults. Earn the highest rates on your favorite everyday and weekend style brands. Simple way to build credit while shopping what you love.',
  },
  {
    id: 'kohls',
    name: "Kohl's Charge Card",
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { kohl: 0.05 },
    perks: [
      '7.5% back in Kohl\'s Cash rewards every day',
      'Special birthday rewards + financing offers',
      'Easy approval for first cards',
      'No annual fee',
    ],
    highlight: '7.5% rewards at Kohl\'s',
    store: "Kohl's",
    description:
      'Wonderful starter card. High everyday rate at Kohl\'s in the form of Kohl\'s Cash + simple rewards. One of the easiest ways for young shoppers to start building credit.',
  },
  {
    id: 'ulta',
    name: 'Ulta Beauty Credit Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { ulta: 0.05 },
    perks: [
      '2x points at Ulta Beauty (card bonus)',
      '20% off first purchase + Platinum boosts',
      'Beauty Insider points synergy',
      'No annual fee',
    ],
    highlight: '5%+ at Ulta Beauty',
    store: 'Ulta',
    description:
      'Beauty lovers rejoice. Highest rewards on skincare, makeup, and haircare. A fun yet practical card for young adults to earn while building a positive credit profile.',
  },
  {
    id: 'jcpenney',
    name: 'JCPenney Credit Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { jcpenney: 0.05 },
    perks: [
      '1.5 pts/$1 = ~7.5% back in CashPass rewards at JCP',
      '$10 birthday CashPass reward',
      'Special financing + free shipping perks',
      'No annual fee',
    ],
    highlight: '5%+ at JCPenney',
    store: 'JCPenney',
    description:
      'Solid department store card with strong effective rewards (CashPass). Birthday gifts and easy approval make it a friendly option for credit-building young adults.',
  },
  {
    id: 'ashley',
    name: 'Ashley Advantage Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { ashley: 0.03 },
    perks: [
      'Special 0% financing on furniture & mattresses',
      'Ashley Rewards + Tuesday Deals',
      'Birthday perks',
      'No annual fee',
    ],
    highlight: 'Financing at Ashley',
    store: 'Ashley',
    description:
      'Best for furnishing your first apartment or home upgrades. Flexible no-interest financing helps young adults afford quality furniture responsibly while establishing credit.',
  },
  {
    id: 'ae',
    name: 'American Eagle Real Rewards Card',
    type: 'store',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: { ae: 0.05 },
    perks: [
      'Up to 16% back in Real Rewards points at AE & Aerie',
      'Denim discounts and member exclusives',
      'No annual fee',
      'High rewards on the styles you actually wear',
    ],
    highlight: 'High rewards at AE/Aerie',
    store: 'AEO',
    description:
      'Top pick for style-focused young adults. Big rewards on AE and Aerie purchases. A fun, responsible way to build credit history while shopping brands you love.',
  },
  {
    id: 'preferred',
    name: 'Synchrony Preferred Mastercard',
    type: 'dual',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: {},
    perks: [
      'Designed specifically for first-time cardholders',
      'No annual fee',
      'Accepted everywhere Mastercard is',
      'Focus on building positive credit history',
    ],
    highlight: 'Credit builder card',
    description:
      'Excellent entry-level dual card for young adults and anyone building credit. Simple acceptance + responsible everyday use helps establish a strong payment history.',
  },
  {
    id: 'plus',
    name: 'Synchrony Plus World Mastercard',
    type: 'dual',
    annualFee: 0,
    baseRate: 0.01,
    storeRates: {},
    perks: [
      '1% cash back on every purchase',
      'No annual fee',
      'Simple flat rewards + Mastercard benefits',
      'Great starter rewards card',
    ],
    highlight: '1% flat + credit building',
    description:
      'Easy flat-rate card for new credit users. Earn a little on everything while focusing on the most important thing: on-time payments that build your credit score.',
  },
];
