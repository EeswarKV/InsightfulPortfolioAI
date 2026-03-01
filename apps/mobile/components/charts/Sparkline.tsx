import React from "react";
import Svg, { Polyline } from "react-native-svg";
import { useThemeColors } from "../../lib/useAppTheme";

interface SparklineProps {
  positive: boolean;
}

export function Sparkline({ positive }: SparklineProps) {
  const colors = useThemeColors();
  const points = positive
    ? "0,20 8,18 16,15 24,16 32,12 40,10 48,8 56,6 64,4"
    : "0,6 8,8 16,10 24,8 32,14 40,16 48,18 56,17 64,20";

  return (
    <Svg width={64} height={24} viewBox="0 0 64 24">
      <Polyline
        points={points}
        fill="none"
        stroke={positive ? colors.green : colors.red}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
