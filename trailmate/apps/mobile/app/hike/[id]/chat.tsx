/**
 * Per-hike group chat (FR-7.2).
 *
 * Membership is not enforced here — RLS is. The insert policy requires an active booking (or
 * being the organizer) *and* that the chat is still writable, so a client that skips these
 * checks simply gets rejected. The UI mirrors the rules so the rejection is never a surprise.
 */

import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { Badge, Button, EmptyState, Screen } from "@/components/ui";
import { useChatMessages, useSendChatMessage, type ChatMessageWithSender } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function HikeChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const messages = useChatMessages(id);
  const send = useSendChatMessage(id);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ChatMessageWithSender>>(null);

  // Realtime keeps the thread live while the screen is mounted; the initial page still comes
  // from the query so history is present on open.
  useEffect(() => {
    const channel = supabase
      .channel(`hike-chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `hike_id=eq.${id}` },
        () => void messages.refetch(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, messages]);

  async function onSend() {
    const body = draft.trim();
    if (!body || !profile) return;
    setDraft("");
    try {
      await send.mutateAsync({ senderId: profile.id, body });
      listRef.current?.scrollToEnd({ animated: true });
    } catch {
      setDraft(body); // put it back so nothing is silently lost
    }
  }

  const pinned = (messages.data ?? []).filter((m) => m.pinned && !m.deleted_at);
  const thread = (messages.data ?? []).filter((m) => !m.deleted_at);

  if (messages.isLoading || messages.error) {
    return (
      <Screen
        loading={messages.isLoading}
        error={messages.error}
        onRetry={() => messages.refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      {pinned.length > 0 ? (
        <View style={styles.pinned}>
          <Badge label="Pinned" tone="info" />
          {pinned.map((message) => (
            <Text key={message.id} style={styles.pinnedText}>
              {message.body}
            </Text>
          ))}
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={thread}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.thread}
        ListEmptyComponent={
          <EmptyState
            title="No messages yet"
            body="Say hello, or ask the organizer about gear and the meeting point."
          />
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === profile?.id;
          return (
            <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
              <View style={[styles.bubble, mine && styles.bubbleMine]}>
                {!mine ? (
                  <Text style={styles.sender}>{item.users?.display_name ?? "Hiker"}</Text>
                ) : null}
                <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                  {item.body}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message the group"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          accessibilityLabel="Message the group"
        />
        <Button label="Send" onPress={() => void onSend()} disabled={!draft.trim()} loading={send.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  pinned: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  pinnedText: { ...typography.body, color: colors.text },
  thread: { padding: spacing.lg, gap: spacing.sm },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "80%",
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  bubbleMine: { backgroundColor: colors.forest, borderColor: colors.forest },
  sender: { ...typography.label, color: colors.textMuted },
  messageText: { ...typography.body, color: colors.text },
  messageTextMine: { color: colors.textInverse },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
});
