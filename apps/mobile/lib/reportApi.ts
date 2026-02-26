import * as FileSystem from "expo-file-system";
import { supabase } from "./supabase";
import { API_URL } from "./constants";

/**
 * Downloads the portfolio PDF report for a client.
 * Returns the local file URI so it can be shared via expo-sharing.
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

  // Convert response to base64 and write to a temp file
  const arrayBuffer = await resp.arrayBuffer();
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
