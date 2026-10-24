import { Resend } from "resend";
import { prisma } from "./db";
import { APP_NAME, REWARDS } from "./constants";
import { referralLink } from "./codes";
import { publishEvent } from "./events";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendWelcomeEmail(input: {
  userId: string;
  email: string;
  referralCode: string;
  dashboardToken: string;
  coins: number;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dashboardUrl = `${baseUrl}/dashboard/${input.dashboardToken}`;
  const link = referralLink(input.referralCode, baseUrl);

  const payload = {
    dashboardUrl,
    referralLink: link,
    coins: input.coins,
    referralCoins: REWARDS.REFERRAL_COINS,
    referralCash: REWARDS.REFERRAL_CASH_CENTS / 100,
    profileBonus: REWARDS.PROFILE_COINS,
  };

  const outbox = await prisma.emailOutbox.create({
    data: {
      userId: input.userId,
      template: "welcome",
      toEmail: input.email,
      payload: JSON.stringify(payload),
      status: "pending",
    },
  });

  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "Prelaunch Engine <onboarding@resend.dev>";

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h1 style="font-size: 22px;">You're on the ${APP_NAME} waitlist</h1>
      <p>Welcome - your account is live with <strong>${input.coins} coins</strong>.</p>
      <p><a href="${dashboardUrl}">Open your personalized dashboard</a></p>
      <h2 style="font-size: 16px;">How rewards work</h2>
      <ul>
        <li>Signup bonus: ${REWARDS.SIGNUP_COINS} coins</li>
        <li>Complete your profile: +${REWARDS.PROFILE_COINS} coins</li>
        <li>Each successful referral: +${REWARDS.REFERRAL_COINS} coins + $${REWARDS.REFERRAL_CASH_CENTS / 100} cash</li>
      </ul>
      <p>Share your link: <a href="${link}">${link}</a></p>
      <p style="color:#666;font-size:12px;">Milestones: 2,500 coins = 2 months premium · 3,000 coins = 3 months premium</p>
    </div>
  `;

  if (!resend) {
    const mocked = await prisma.emailOutbox.update({
      where: { id: outbox.id },
      data: { status: "mocked", sentAt: new Date(), providerId: "mock-resend" },
    });
    publishEvent({
      type: "email_queued",
      message: `Welcome email mocked → ${input.email} (dashboard link ready)`,
      sql: `INSERT INTO EmailOutbox …; UPDATE EmailOutbox SET status='mocked' WHERE id='${outbox.id}';`,
      data: { outboxId: mocked.id, mode: "mock", dashboardUrl },
    });
    return { mode: "mock" as const, outboxId: mocked.id, dashboardUrl };
  }

  try {
    const result = await resend.emails.send({
      from,
      to: input.email,
      subject: `Welcome to ${APP_NAME} - your dashboard is ready`,
      html,
    });
    const providerId =
      result.data && "id" in result.data ? String(result.data.id) : "resend";
    await prisma.emailOutbox.update({
      where: { id: outbox.id },
      data: { status: "sent", sentAt: new Date(), providerId },
    });
    publishEvent({
      type: "email_queued",
      message: `Welcome email sent via Resend → ${input.email}`,
      sql: `INSERT INTO EmailOutbox …; UPDATE EmailOutbox SET status='sent', providerId='${providerId}';`,
      data: { outboxId: outbox.id, mode: "resend", dashboardUrl },
    });
    return { mode: "resend" as const, outboxId: outbox.id, dashboardUrl };
  } catch (err) {
    await prisma.emailOutbox.update({
      where: { id: outbox.id },
      data: { status: "failed" },
    });
    throw err;
  }
}
