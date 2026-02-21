import type { DBTransaction, DBHolding } from "../types";

interface CashFlow {
  date: Date;
  amount: number;
}

/**
 * Calculate XIRR (Extended Internal Rate of Return) using Newton-Raphson method.
 * XIRR is the annualized rate of return that accounts for the timing of cash flows.
 *
 * @param cashFlows - Array of { date, amount } where negative = investment, positive = return
 * @returns XIRR as a decimal (e.g., 0.15 = 15% annual return) or null if calculation fails
 */
export function calculateXIRR(cashFlows: CashFlow[]): number | null {
  if (cashFlows.length < 2) return null;

  // Sort cash flows by date
  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const firstDate = sorted[0].date;

  // Convert dates to days from first cash flow
  const flows = sorted.map(cf => ({
    days: daysBetween(firstDate, cf.date),
    amount: cf.amount,
  }));

  // Newton-Raphson method to find the rate where NPV = 0
  let rate = 0.1; // Initial guess: 10%
  const maxIterations = 100;
  const precision = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0; // Derivative of NPV

    for (const flow of flows) {
      const years = flow.days / 365;
      const factor = Math.pow(1 + rate, years);
      npv += flow.amount / factor;
      dnpv -= (years * flow.amount) / (factor * (1 + rate));
    }

    const newRate = rate - npv / dnpv;

    if (Math.abs(newRate - rate) < precision) {
      return newRate;
    }

    rate = newRate;

    // Prevent divergence
    if (!isFinite(rate) || Math.abs(rate) > 10) {
      return null;
    }
  }

  return null; // Failed to converge
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * Calculate XIRR for a portfolio based on transactions and current holdings value.
 *
 * @param transactions - All buy/sell/dividend transactions
 * @param currentValue - Current market value of all holdings
 * @returns XIRR as percentage (e.g., 15.5 for 15.5% annual return) or null if insufficient data
 */
export function calculatePortfolioXIRR(
  transactions: DBTransaction[],
  currentValue: number
): number | null {
  if (transactions.length === 0) return null;

  const cashFlows: CashFlow[] = [];

  // Add all transactions as cash flows
  for (const tx of transactions) {
    const amount = tx.quantity * tx.price;

    cashFlows.push({
      date: new Date(tx.date),
      amount: tx.type === "buy" ? -amount : amount, // Buy = negative (money out), Sell/Dividend = positive (money in)
    });
  }

  // Add current portfolio value as final positive cash flow (what you'd get if you sold today)
  cashFlows.push({
    date: new Date(),
    amount: currentValue,
  });

  const xirrDecimal = calculateXIRR(cashFlows);

  if (xirrDecimal === null) return null;

  // Convert to percentage
  return xirrDecimal * 100;
}

/**
 * Calculate XIRR based on holdings purchase dates instead of transactions.
 * Useful when transaction history is incomplete but you have purchase dates.
 *
 * @param holdings - Portfolio holdings with purchase dates
 * @param livePrices - Current market prices
 * @returns XIRR as percentage or null if insufficient data
 */
export function calculateHoldingsXIRR(
  holdings: DBHolding[],
  livePrices: Map<string, { symbol: string; price: number }>
): number | null {
  if (holdings.length === 0) return null;

  try {
    const cashFlows: CashFlow[] = [];
    let currentValue = 0;

    for (const holding of holdings) {
      // Skip holdings without purchase_date
      if (!holding.purchase_date) {
        console.warn(`Holding ${holding.symbol} missing purchase_date, skipping from XIRR`);
        continue;
      }

      const qty = Number(holding.quantity);
      const avgCost = Number(holding.avg_cost);
      const livePrice = livePrices.get(holding.symbol);
      const currentPrice = livePrice?.price || avgCost;

      // Purchase as negative cash flow
      cashFlows.push({
        date: new Date(holding.purchase_date),
        amount: -(qty * avgCost),
      });

      // Accumulate current value
      currentValue += qty * currentPrice;
    }

    // Need at least one cash flow to calculate XIRR
    if (cashFlows.length === 0) return null;

    // Add current portfolio value as final positive cash flow
    cashFlows.push({
      date: new Date(),
      amount: currentValue,
    });

    const xirrDecimal = calculateXIRR(cashFlows);

    if (xirrDecimal === null) return null;

    return xirrDecimal * 100;
  } catch (error) {
    console.error("Error calculating XIRR:", error);
    return null;
  }
}
