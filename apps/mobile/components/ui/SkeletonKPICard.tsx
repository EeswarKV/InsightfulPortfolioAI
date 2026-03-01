import { View, StyleSheet } from "react-native";
import { useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor: t.border,
      gap: 8,
    },
    skeleton: {
      backgroundColor: t.surface,
      borderRadius: 6,
      opacity: 0.6,
    },
    label: {
      height: 12,
      width: "50%",
    },
    value: {
      height: 24,
      width: "80%",
    },
    subtitle: {
      height: 10,
      width: "40%",
    },
  });
}

export function SkeletonKPICard() {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <View style={[styles.skeleton, styles.label]} />
      <View style={[styles.skeleton, styles.value]} />
      <View style={[styles.skeleton, styles.subtitle]} />
    </View>
  );
}
