import { View, StyleSheet } from "react-native";
import { theme } from "../../lib/theme";

export function SkeletonKPICard() {
  return (
    <View style={styles.container}>
      <View style={[styles.skeleton, styles.label]} />
      <View style={[styles.skeleton, styles.value]} />
      <View style={[styles.skeleton, styles.subtitle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  skeleton: {
    backgroundColor: theme.colors.surface,
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
