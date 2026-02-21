import React from "react";
import { View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { theme } from "../../lib/theme";

interface DonutData {
  label: string;
  value: number;
}

interface DonutChartProps {
  data: DonutData[];
  size?: number;
}

const COLORS = ["#4F8CFF", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#FB923C", "#38BDF8"];

export function DonutChart({ data, size = 130 }: DonutChartProps) {
  let cumulative = 0;
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 40;
  const cx = 50;
  const cy = 50;

  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const start = cumulative;
    cumulative += pct;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const largeArc = pct > 0.5 ? 1 : 0;

    const pathD = `M ${cx} ${cy} L ${cx + r * Math.cos(startAngle)} ${cy + r * Math.sin(startAngle)} A ${r} ${r} 0 ${largeArc} 1 ${cx + r * Math.cos(endAngle)} ${cy + r * Math.sin(endAngle)} Z`;

    return (
      <Path
        key={i}
        d={pathD}
        fill={COLORS[i % COLORS.length]}
        opacity={0.85}
      />
    );
  });

  return (
    <View>
      <Svg viewBox="0 0 100 100" width={size} height={size}>
        {segments}
        <Circle cx={cx} cy={cy} r={24} fill={theme.colors.card} />
      </Svg>
    </View>
  );
}
