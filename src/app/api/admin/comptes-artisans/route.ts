import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readStore } from "@/lib/store";
import { formatProTradeSelections, getProTradeSelections } from "@/lib/pro-trades";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const store = await readStore();
  const accounts = store.proRegistrations
    .map((pro) => {
      const wallet = store.creditWallets.find((w) => w.proId === pro.id);
      const spentCredits = store.creditTransactions
        .filter(
          (t) =>
            t.proId === pro.id &&
            (t.type === "spend_unlock" || t.type === "spend_bid")
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const bidsCount = store.bids.filter((b) => b.proId === pro.id).length;
      const unlocksCount = store.contactUnlocks.filter((u) => u.proId === pro.id).length;
      const referralsCount = store.proRegistrations.filter(
        (p) => p.referredByProId === pro.id
      ).length;

      const { passwordHash: _passwordHash, ...safe } = pro;
      return {
        ...safe,
        tradesLabel: formatProTradeSelections(pro) || getProTradeSelections(pro)
          .map((t) => t.tradeGroupLabel)
          .join(" · "),
        creditBalance: wallet?.balance ?? 0,
        spentCredits,
        bidsCount,
        unlocksCount,
        referralsCount,
        emailVerified: pro.emailVerified !== false,
      };
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return NextResponse.json({
    accounts,
    stats: {
      total: accounts.length,
      approved: accounts.filter((a) => a.status === "approved").length,
      pending: accounts.filter((a) => a.status === "pending").length,
      rejected: accounts.filter((a) => a.status === "rejected").length,
      emailUnverified: accounts.filter((a) => a.emailVerified === false).length,
    },
  });
}
