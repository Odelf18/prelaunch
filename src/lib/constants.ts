export const REWARDS = {
  SIGNUP_COINS: 100,
  PROFILE_COINS: 400,
  REFERRAL_COINS: 500,
  REFERRAL_CASH_CENTS: 2000, // $20
} as const;

export const MILESTONES = [
  { coins: 2500, label: "2 months free premium", months: 2 },
  { coins: 3000, label: "3 months free premium", months: 3 },
] as const;

export const APP_NAME = "Prelaunch Engine";
export const APP_TAGLINE = "Waitlist · referrals · rewards — live.";
