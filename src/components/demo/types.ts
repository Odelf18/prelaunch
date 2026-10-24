export type TreeNode = {
  id: string;
  email: string;
  label: string;
  referralCode: string;
  parentId: string | null;
  coins: number;
  cashCents: number;
  city: string | null;
  country: string | null;
  nodeHash: string | null;
  prevHash: string | null;
  createdAt: string;
};

export type LedgerRow = {
  id: string;
  userId: string;
  type: string;
  amountCoins: number;
  amountCents: number;
  idempotencyKey: string;
  createdAt: string;
  user: { email: string; referralCode: string };
};

export type AdminStats = {
  totalSignups: number;
  completedProfiles: number;
  referralsConverted: number;
  totalCoinsIssued: number;
  totalCashCents: number;
  topReferrers: {
    email: string;
    referralCode: string;
    referrals: number;
    coins: number;
    cashCents: number;
  }[];
  byCountry: { country: string; count: number }[];
  recentUsers: {
    id: string;
    email: string;
    referralCode: string;
    coinsBalance: number;
    cashEarnedCents: number;
    city: string | null;
    country: string | null;
    createdAt: string;
    referredById: string | null;
  }[];
};

export type FeedEvent = {
  id: string;
  type: string;
  message: string;
  sql?: string;
  data?: Record<string, unknown>;
  ts: number;
};
