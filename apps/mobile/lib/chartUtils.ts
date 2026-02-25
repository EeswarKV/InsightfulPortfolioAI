import type { DBTransaction, DBHolding } from "../types";
import type { PortfolioSnapshot } from "./api";

interface BarData {
  label: string;
  value: number;
  percentage?: number;
}

export type ChartPeriod = "daily" | "monthly" | "yearly";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Returns last N business days (Mon–Fri) in chronological order ending today. */
function lastBusinessDays(n: number): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.length < n) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.unshift(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days;
}

interface LivePrice {
  symbol: string;
  price: number;
}

/**
 * Compute net investment flow per period from transactions.
 * Buy = positive flow, Sell = negative flow, Dividend = positive.
 */
export function computePerformanceData(
  transactions: DBTransaction[],
  period: ChartPeriod
): BarData[] {
  if (transactions.length === 0) return [];

  const now = new Date();
  const buckets: Record<string, number> = {};
  const labels: string[] = [];

  if (period === "daily") {
    // Last 7 business days (Mon–Fri only)
    const bizDays = lastBusinessDays(7);
    const todayStr = now.toISOString().slice(0, 10);
    for (const d of bizDays) {
      const key = d.toISOString().slice(0, 10);
      labels.push(key === todayStr ? "Today" : DAY_NAMES[d.getDay()]);
      buckets[key] = 0;
    }
  } else if (period === "monthly") {
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      labels.push(monthNames[d.getMonth()]);
      buckets[key] = 0;
    }
  } else {
    // Last 5 years
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      const key = `${year}`;
      labels.push(`${year}`);
      buckets[key] = 0;
    }
  }

  const bucketKeys = Object.keys(buckets);

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    let key: string;

    if (period === "daily") {
      key = txDate.toISOString().slice(0, 10);
    } else if (period === "monthly") {
      key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
    } else {
      key = `${txDate.getFullYear()}`;
    }

    if (key in buckets) {
      const amount = tx.quantity * tx.price;
      if (tx.type === "sell") {
        buckets[key] -= amount;
      } else {
        buckets[key] += amount;
      }
    }
  }

  return bucketKeys.map((key, i) => ({
    label: labels[i],
    value: buckets[key],
  }));
}

/**
 * Compute portfolio performance over time periods.
 * Shows how the portfolio performed during each time period (daily/monthly/yearly).
 *
 * Calculation approach:
 * - For each period, calculates the estimated value change of holdings that existed during that period
 * - Uses linear interpolation between purchase price and current price
 * - This is an approximation since we don't have historical price data
 */
export function computeHoldingsPerformance(
  holdings: DBHolding[],
  livePrices: Map<string, LivePrice>,
  period: ChartPeriod
): BarData[] {
  if (holdings.length === 0) return [];

  const now = new Date();
  const buckets: Record<string, { periodStart: Date; periodEnd: Date }> = {};
  const labels: string[] = [];

  // Create time buckets with start and end dates
  if (period === "daily") {
    const bizDays = lastBusinessDays(7);
    const todayStr = now.toISOString().slice(0, 10);
    for (const day of bizDays) {
      const periodStart = new Date(day);
      const periodEnd = new Date(day);
      periodEnd.setHours(23, 59, 59, 999);
      const key = periodStart.toISOString().slice(0, 10);
      labels.push(key === todayStr ? "Today" : DAY_NAMES[day.getDay()]);
      buckets[key] = { periodStart, periodEnd };
    }
  } else if (period === "monthly") {
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const key = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      labels.push(monthNames[periodStart.getMonth()]);
      buckets[key] = { periodStart, periodEnd };
    }
  } else {
    // Last 5 years
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      const periodStart = new Date(year, 0, 1);
      const periodEnd = new Date(year, 11, 31, 23, 59, 59, 999);

      const key = `${year}`;
      labels.push(`${year}`);
      buckets[key] = { periodStart, periodEnd };
    }
  }

  const bucketKeys = Object.keys(buckets);

  // Fallback purchase date for holdings without one: 1 day before the first bucket,
  // so their total gain/loss is spread evenly across all visible periods.
  const firstBucketStart = bucketKeys.length > 0 ? buckets[bucketKeys[0]].periodStart : now;
  const fallbackPurchaseDate = new Date(firstBucketStart);
  fallbackPurchaseDate.setDate(fallbackPurchaseDate.getDate() - 1);

  // Calculate performance for each period
  console.log("=== Chart Performance Calculation ===");
  console.log(`Period: ${period}, Holdings count: ${holdings.length}`);

  const performance = bucketKeys.map((key, i) => {
    const { periodStart, periodEnd } = buckets[key];
    let periodReturn = 0;
    let totalValueAtStart = 0;

    for (const holding of holdings) {
      try {
        const purchaseDate = holding.purchase_date
          ? new Date(holding.purchase_date)
          : fallbackPurchaseDate;
        if (isNaN(purchaseDate.getTime())) continue;

        // Only include holdings that existed during this period
        if (purchaseDate > periodEnd) continue;

        const qty = Number(holding.quantity);
        const avgCost = Number(holding.avg_cost);
        const livePrice = livePrices.get(holding.symbol);
        const currentPrice = livePrice?.price ?? holding.manual_price ?? avgCost;

        // Calculate estimated price at period start and end using linear interpolation
        const totalDays = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
        const priceChange = currentPrice - avgCost;
        const dailyChange = totalDays > 0 ? priceChange / totalDays : 0;

        // Estimate price at period start
        const daysFromPurchaseToPeriodStart = Math.max(0, (periodStart.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const priceAtPeriodStart = avgCost + (dailyChange * daysFromPurchaseToPeriodStart);

        // Estimate price at period end (or current price if period is ongoing)
        const effectiveEndDate = periodEnd > now ? now : periodEnd;
        const daysFromPurchaseToPeriodEnd = (effectiveEndDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
        const priceAtPeriodEnd = avgCost + (dailyChange * daysFromPurchaseToPeriodEnd);

        // Period return for this holding
        const holdingReturn = qty * (priceAtPeriodEnd - priceAtPeriodStart);
        periodReturn += holdingReturn;
        totalValueAtStart += qty * priceAtPeriodStart;

        if (i === 0) { // Log details for first period
          console.log(`${holding.symbol}: purchase=${purchaseDate.toDateString()}, totalDays=${totalDays.toFixed(1)}, avgCost=₹${avgCost}, current=₹${currentPrice}, dailyChange=₹${dailyChange.toFixed(2)}`);
        }
      } catch (error) {
        console.error(`Error calculating performance for ${holding.symbol}:`, error);
      }
    }

    const percentage = totalValueAtStart > 0 ? (periodReturn / totalValueAtStart) * 100 : undefined;
    console.log(`Period ${labels[i]} (${key}): return = ₹${periodReturn.toFixed(2)}${percentage !== undefined ? ` (${percentage.toFixed(2)}%)` : ""}`);

    return {
      label: labels[i],
      value: periodReturn,
      percentage,
    };
  });

  console.log("=====================================");
  return performance;
}

/**
 * Compute portfolio performance from historical snapshots.
 * This provides ACCURATE daily/monthly/yearly performance based on actual values.
 * Falls back to linear interpolation if snapshots are not available.
 */
export function computePerformanceFromSnapshots(
  snapshots: PortfolioSnapshot[],
  period: ChartPeriod
): BarData[] {
  if (snapshots.length === 0) return [];

  console.log("=== Snapshot-based Performance Calculation ===");
  console.log(`Period: ${period}, Snapshots available: ${snapshots.length}`);

  const now = new Date();
  const labels: string[] = [];
  const data: BarData[] = [];

  // Sort snapshots by date (oldest first)
  const sortedSnapshots = [...snapshots].sort((a, b) =>
    new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );

  if (period === "daily") {
    // Last 7 business days (Mon–Fri), clipped to the first snapshot date
    const firstSnapshotDate = sortedSnapshots.length > 0
      ? new Date(sortedSnapshots[0].snapshot_date)
      : null;
    const allBizDays = lastBusinessDays(7);
    const bizDays = firstSnapshotDate
      ? allBizDays.filter((d) => d >= firstSnapshotDate)
      : allBizDays;
    const todayStr = now.toISOString().slice(0, 10);
    for (const day of bizDays) {
      const dayStr = day.toISOString().slice(0, 10);
      labels.push(dayStr === todayStr ? "Today" : DAY_NAMES[day.getDay()]);

      // Find snapshot for this day and previous business day
      const daySnapshot = sortedSnapshots.find(s => s.snapshot_date === dayStr);

      const prevDay = new Date(day);
      prevDay.setDate(prevDay.getDate() - 1);
      // If previous day is weekend, step back to last Friday
      while (prevDay.getDay() === 0 || prevDay.getDay() === 6) prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = prevDay.toISOString().slice(0, 10);
      const prevSnapshot = sortedSnapshots.find(s => s.snapshot_date === prevDayStr);

      if (daySnapshot && prevSnapshot) {
        const change = daySnapshot.total_value - prevSnapshot.total_value;
        const percentage = prevSnapshot.total_value > 0
          ? (change / prevSnapshot.total_value) * 100
          : 0;

        console.log(`${labels[labels.length - 1]}: ₹${change.toFixed(2)} (${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%)`);

        data.push({
          label: labels[labels.length - 1],
          value: change,
          percentage,
        });
      } else {
        data.push({
          label: labels[labels.length - 1],
          value: 0,
          percentage: 0,
        });
      }
    }
  } else if (period === "monthly") {
    // Last 6 months
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      labels.push(monthNames[monthStart.getMonth()]);

      // Find snapshots closest to month boundaries
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      // Get first snapshot of the month (or closest before)
      const startSnapshot = sortedSnapshots
        .filter(s => s.snapshot_date <= monthStartStr)
        .pop() || sortedSnapshots.find(s => s.snapshot_date >= monthStartStr);

      // Get last snapshot of the month (or latest available)
      const endSnapshot = sortedSnapshots
        .filter(s => s.snapshot_date <= monthEndStr)
        .pop();

      if (startSnapshot && endSnapshot && startSnapshot.snapshot_date !== endSnapshot.snapshot_date) {
        const change = endSnapshot.total_value - startSnapshot.total_value;
        const percentage = startSnapshot.total_value > 0
          ? (change / startSnapshot.total_value) * 100
          : 0;

        console.log(`${labels[labels.length - 1]}: ₹${change.toFixed(2)} (${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%)`);

        data.push({
          label: labels[labels.length - 1],
          value: change,
          percentage,
        });
      } else {
        data.push({
          label: labels[labels.length - 1],
          value: 0,
          percentage: 0,
        });
      }
    }
  } else {
    // Last 5 years
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      labels.push(`${year}`);

      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const yearStartStr = yearStart.toISOString().split('T')[0];
      const yearEndStr = yearEnd.toISOString().split('T')[0];

      // Get first snapshot of the year (or closest before)
      const startSnapshot = sortedSnapshots
        .filter(s => s.snapshot_date <= yearStartStr)
        .pop() || sortedSnapshots.find(s => s.snapshot_date >= yearStartStr);

      // Get last snapshot of the year (or latest available)
      const endSnapshot = sortedSnapshots
        .filter(s => s.snapshot_date <= yearEndStr)
        .pop();

      if (startSnapshot && endSnapshot && startSnapshot.snapshot_date !== endSnapshot.snapshot_date) {
        const change = endSnapshot.total_value - startSnapshot.total_value;
        const percentage = startSnapshot.total_value > 0
          ? (change / startSnapshot.total_value) * 100
          : 0;

        console.log(`${labels[labels.length - 1]}: ₹${change.toFixed(2)} (${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%)`);

        data.push({
          label: labels[labels.length - 1],
          value: change,
          percentage,
        });
      } else {
        data.push({
          label: labels[labels.length - 1],
          value: 0,
          percentage: 0,
        });
      }
    }
  }

  console.log("==============================================");
  return data;
}
