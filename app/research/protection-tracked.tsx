import { Redirect } from "expo-router";

// Keep old deep links safe without mounting the archived screen or its queries.
export default function RetiredTradingScreen() {
  return <Redirect href="/(tabs)/research" />;
}
