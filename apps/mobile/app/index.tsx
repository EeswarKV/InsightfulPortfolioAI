import { View, ActivityIndicator, StyleSheet } from "react-native";
import { theme } from "../lib/theme";

export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
  },
});
