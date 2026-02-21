export function formatCurrency(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function formatPercentChange(change: number): string {
  return `${change >= 0 ? "+" : ""}${change}%`;
}

export function getGreeting(fullName?: string): string {
  const hour = new Date().getHours();
  const firstName = fullName?.split(" ")[0] || "";
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
}
