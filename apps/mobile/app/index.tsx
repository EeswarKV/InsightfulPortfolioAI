import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useThemeColors, useThemedStyles } from "../lib/useAppTheme";
import type { ThemeColors } from "../lib/themes";

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: t.bg,
    },
  });
}

export default function Index() {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}
