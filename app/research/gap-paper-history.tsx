import { Redirect } from "expo-router";

// Old paper and historical-pilot links never mount the archived queries or data.
export default function RetiredGapPaperScreen() {
  return <Redirect href="/(tabs)/research" />;
}
