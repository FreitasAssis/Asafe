import type { RepertoireType } from "@asafe/core";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function Home() {
  // Prova de fumaça: o app mobile consome o pacote @asafe/core do monorepo.
  const exemplo: RepertoireType = "Missa";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asafe 🎵</Text>
      <Text style={styles.body}>
        Organize e compartilhe repertórios de música litúrgica católica.
      </Text>
      <Text style={styles.muted}>
        Tipo de exemplo (@asafe/core): {exemplo}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 32, fontWeight: "700" },
  body: { fontSize: 16, textAlign: "center" },
  muted: { fontSize: 14, color: "#666" },
});
