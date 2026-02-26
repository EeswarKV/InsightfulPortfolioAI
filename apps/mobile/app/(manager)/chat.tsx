import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector } from "react-redux";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { supabase } from "../../lib/supabase";
import type { ChatMessage } from "../../types";
import type { RootState } from "../../store";
import { API_URL } from "../../lib/constants";

const CLIENT_WELCOME: ChatMessage = {
  role: "bot",
  text: "Hello! I'm your Fund Manager Assistant 👋\n\nI'm here on behalf of your fund manager to help you understand and make the most of your portfolio. Ask me anything:\n\n• Understanding your current holdings & performance\n• Why specific stocks or funds were chosen\n• Portfolio breakdown, allocation & risk profile\n• How to read your returns and benchmarks\n• Scheduling a call with your fund manager\n\nWhat would you like to know today?",
};

const MANAGER_WELCOME: ChatMessage = {
  role: "bot",
  text: "Hello! I'm your personal market assistant 👋\n\nPowered by Claude, I'm here to help you make better investment decisions. Here's what I can do:\n\n• Deep-dive analysis on any NSE/BSE stock\n• Portfolio strategy, risk assessment & rebalancing ideas\n• Sector trends, earnings analysis & macroeconomic insights\n• Compare stocks, screen for opportunities\n• Explain financial metrics in plain language\n\nWhat would you like to explore today?",
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Not authenticated");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export default function ChatScreen() {
  const { role } = useSelector((s: RootState) => s.auth);
  const welcome = role === "client" ? CLIENT_WELCOME : MANAGER_WELCOME;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const isWide = useIsWebWide();

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: "client", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text,
          history: messages.filter((m) => m.text !== welcome.text),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: "Chat failed" }));
        throw new Error(err.detail || `Chat failed (${resp.status})`);
      }

      const data = await resp.json();
      let replyText: string = data.reply;

      // Check for schedule call tag from AI
      const scheduleMatch = replyText.match(
        /\[SCHEDULE_CALL\]\s*([\s\S]*?)\s*\[\/SCHEDULE_CALL\]/
      );
      if (scheduleMatch) {
        // Strip the tag from the displayed message
        replyText = replyText
          .replace(/\[SCHEDULE_CALL\][\s\S]*?\[\/SCHEDULE_CALL\]/, "")
          .trim();

        try {
          const scheduleData = JSON.parse(scheduleMatch[1]);
          const schedResp = await fetch(`${API_URL}/call-requests/`, {
            method: "POST",
            headers,
            body: JSON.stringify(scheduleData),
          });
          if (schedResp.ok) {
            replyText +=
              "\n\n✅ Your call request has been submitted successfully! Your fund manager will be notified.";
          }
        } catch {
          // If parsing/submission fails, just show the reply without the tag
        }
      }

      const botMsg: ChatMessage = { role: "bot", text: replyText };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: "bot",
        text: `Sorry, I couldn't process that. ${err.message || "Please try again."}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header (mobile only) */}
      {!isWide && (
        <View style={styles.mobileHeader}>
          <Text style={styles.pageTitle}>
            {role === "client" ? "Fund Manager Assistant" : "My AI Assistant"}
          </Text>
          <Text style={styles.subtitle}>
            {role === "client"
              ? "Powered by Claude · Ask about your portfolio"
              : "Powered by Claude · Market analysis & strategy"}
          </Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={[
          styles.messageContent,
          isWide && styles.messageContentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.msgRow,
              msg.role === "client"
                ? styles.msgRowRight
                : styles.msgRowLeft,
            ]}
          >
            {msg.role === "bot" && isWide && (
              <LinearGradient
                colors={theme.gradients.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.botAvatar}
              >
                <Feather name="message-circle" size={14} color="#fff" />
              </LinearGradient>
            )}
            {msg.role === "client" ? (
              <LinearGradient
                colors={theme.gradients.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bubble, styles.bubbleUser]}
              >
                <Text style={styles.bubbleTextUser}>{msg.text}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.bubble, styles.bubbleBot]}>
                <Text style={styles.bubbleTextBot}>{msg.text}</Text>
              </View>
            )}
          </View>
        ))}
        {sending && (
          <View style={[styles.msgRow, styles.msgRowLeft]}>
            {isWide && (
              <LinearGradient
                colors={theme.gradients.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.botAvatar}
              >
                <Feather name="message-circle" size={14} color="#fff" />
              </LinearGradient>
            )}
            <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputBar, isWide && styles.inputBarWide]}>
        <View style={[styles.inputRow, isWide && styles.inputRowWide]}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={
              isWide
                ? "Ask about portfolios, risk exposure, market impact..."
                : "Ask about your investments..."
            }
            placeholderTextColor={theme.colors.textMuted}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            editable={!sending}
          />
          <TouchableOpacity
            onPress={sendMessage}
            activeOpacity={0.7}
            disabled={sending}
          >
            <LinearGradient
              colors={theme.gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            >
              <Feather name="send" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  mobileHeader: {
    padding: 20,
    paddingBottom: 12,
  },
  pageTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: 16,
    paddingTop: 8,
  },
  messageContentWide: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 32,
  },
  msgRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  msgRowRight: {
    justifyContent: "flex-end",
  },
  msgRowLeft: {
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 4,
  },
  bubble: {
    maxWidth: "82%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleTextUser: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 20,
  },
  bubbleTextBot: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputBarWide: {
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputRowWide: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    gap: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
