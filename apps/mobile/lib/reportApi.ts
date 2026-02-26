import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "./supabase";
import { API_URL } from "./constants";

/**
 * Downloads the portfolio PDF report for a client.
 * On web: triggers a browser file download directly.
 * On native: writes to cache directory and returns the local file URI
 *            so it can be shared via expo-sharing.
 */
export async function downloadPortfolioReport(clientId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const resp = await fetch(`${API_URL}/reports/portfolio/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "Unknown error");
    throw new Error(`Report generation failed: ${text}`);
  }

  const arrayBuffer = await resp.arrayBuffer();

  if (Platform.OS === "web") {
    // On web, trigger a browser download via a temporary anchor element
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio_report_${clientId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return "";
  }

  // Native (iOS / Android): write to cache and return URI for sharing
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const fileUri = `${FileSystem.cacheDirectory}portfolio_report_${clientId}.pdf`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return fileUri;
}
