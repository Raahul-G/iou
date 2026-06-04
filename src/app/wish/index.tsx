import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { usePartnership } from "@/hooks/use-partnerships";
import {
  useActiveWish,
  useWishHistory,
  useUpdateWishStatus,
  type Wish,
  type WishStatus,
} from "@/hooks/use-wishes";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { WISH_MOODS } from "@/constants/app";

// ─── Mood emoji lookup ────────────────────────────────────────────────────────

const MOOD_EMOJI: Record<string, string> = Object.fromEntries(
  WISH_MOODS.map((m) => [m.key, m.emoji])
);

// ─── Status info shown to the wish creator while waiting ─────────────────────

function creatorStatusLabel(status: WishStatus): string {
  switch (status) {
    case "active":   return "Waiting for your partner to respond…";
    case "accepted": return "Your partner accepted — they'll let you know when it's done.";
    case "on_hold":  return "Your partner said \"not right now\".";
    case "fulfilled":return "Your partner says they've done it! Confirm below.";
    default:         return "";
  }
}

// ─── Wish card ────────────────────────────────────────────────────────────────

function WishCard({ wish, creatorName }: { wish: Wish; creatorName: string }) {
  const mood = MOOD_EMOJI[wish.mood] ?? "💌";
  return (
    <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-5 border border-sand dark:border-[#3D2B3D] gap-3">
      <View className="flex-row items-center gap-2">
        <Text style={{ fontSize: 22 }}>{mood}</Text>
        <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
          A wish from {creatorName}
        </Text>
      </View>
      <Text className="text-base text-brown-deep dark:text-offwhite leading-relaxed">
        {wish.text}
      </Text>
    </View>
  );
}

// ─── Decline note (shown to creator when on_hold) ─────────────────────────────

function DeclineNote({ wish }: { wish: Wish }) {
  if (!wish.decline_text && !wish.decline_mood) return null;
  const emoji = wish.decline_mood ? (MOOD_EMOJI[wish.decline_mood] ?? "") : "";
  return (
    <View className="bg-sand/30 dark:bg-[#160F16] rounded-xl px-4 py-3 gap-1">
      <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
        Their note
      </Text>
      {wish.decline_text ? (
        <Text className="text-sm text-brown-deep dark:text-offwhite">
          {emoji ? `${emoji} ` : ""}{wish.decline_text}
        </Text>
      ) : (
        <Text className="text-sm text-brown-muted dark:text-[#8A7385]">{emoji}</Text>
      )}
    </View>
  );
}

// ─── History row ─────────────────────────────────────────────────────────────

function HistoryRow({ wish }: { wish: Wish }) {
  const mood = MOOD_EMOJI[wish.mood] ?? "💌";
  return (
    <View className="flex-row items-start gap-3 py-2.5 border-b border-sand dark:border-[#3D2B3D]">
      <Text className="text-base mt-0.5">{mood}</Text>
      <Text
        className="flex-1 text-sm text-brown-muted dark:text-[#8A7385] leading-relaxed"
        numberOfLines={2}
      >
        {wish.text}
      </Text>
      <Text className="text-xs text-brown-muted dark:text-[#8A7385] mt-0.5">
        {wish.status === "confirmed" ? "✓" : "✕"}
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function WishScreen() {
  const { user } = useAuthStore();
  const { data: partnership, isLoading: partnershipLoading } = usePartnership();
  const { data: activeWish, isLoading: wishLoading } = useActiveWish(
    partnership?.status === "active" ? partnership.id : undefined
  );
  const { data: history } = useWishHistory(
    partnership?.status === "active" ? partnership.id : undefined
  );
  const updateWish = useUpdateWishStatus();

  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineText, setDeclineText] = useState("");
  const [showThankYouInput, setShowThankYouInput] = useState(false);
  const [thankYouNote, setThankYouNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  if (partnershipLoading || wishLoading) {
    return (
      <View className="flex-1 bg-cream dark:bg-bark items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!partnership || partnership.status !== "active") {
    router.replace("/");
    return null;
  }

  const partnerFirst = partnership.partner_name.split(" ")[0];
  const partnershipId = partnership.id;

  // Who am I relative to the active wish?
  const amCreator = !!activeWish && activeWish.creator_id === user?.id;
  const amTarget  = !!activeWish && activeWish.target_id  === user?.id;

  // Creator name for the WishCard header
  const wishCreatorName = amTarget ? partnerFirst : "you";

  const mutate = async (action: Parameters<typeof updateWish.mutateAsync>[0]) => {
    setActionError(null);
    try {
      await updateWish.mutateAsync(action);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleAccept = () =>
    mutate({ wishId: activeWish!.id, partnershipId, action: "accept" });

  const handleNotRightNow = async () => {
    if (!showDeclineInput) { setShowDeclineInput(true); return; }
    await mutate({
      wishId: activeWish!.id,
      partnershipId,
      action: "not_right_now",
      decline_text: declineText.trim() || undefined,
    });
    setShowDeclineInput(false);
    setDeclineText("");
  };

  const handleWithdraw = () => {
    const doWithdraw = () =>
      mutate({ wishId: activeWish!.id, partnershipId, action: "withdraw" });

    if (Platform.OS === "web") {
      if (window.confirm("Withdraw this wish?")) doWithdraw();
      return;
    }
    Alert.alert("Withdraw wish?", "The wish will be removed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Withdraw", style: "destructive", onPress: doWithdraw },
    ]);
  };

  const handleMarkDone = () =>
    mutate({ wishId: activeWish!.id, partnershipId, action: "mark_done" });

  const handleConfirm = async () => {
    if (!showThankYouInput) { setShowThankYouInput(true); return; }
    await mutate({
      wishId: activeWish!.id,
      partnershipId,
      action: "confirm",
      thank_you_note: thankYouNote.trim() || undefined,
    });
    setShowThankYouInput(false);
    setThankYouNote("");
  };

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-bark"
      contentContainerClassName="pb-10"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4 border-b border-sand dark:border-[#3D2B3D]">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base text-brown-warm dark:text-umber">Back</Text>
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-brown-deep dark:text-offwhite">
          Your wish
        </Text>
        {/* Both partners can make a wish when the slot is empty */}
        {!activeWish && (
          <Pressable
            onPress={() => router.push("/wish/new")}
            className="bg-brown-warm dark:bg-umber rounded-full px-3 py-1.5"
          >
            <Text className="text-xs font-semibold text-white">+ Wish</Text>
          </Pressable>
        )}
      </View>

      <View className="px-5 py-6 gap-5">
        {actionError && (
          <Text className="text-sm text-red-500 text-center">{actionError}</Text>
        )}

        {/* ── No active wish — both can make one ──────────────────── */}
        {!activeWish && (
          <View className="items-center gap-4 py-8">
            <Text style={{ fontSize: 56 }}>🌱</Text>
            <View className="items-center gap-1">
              <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
                No wish yet
              </Text>
              <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center px-4 leading-relaxed">
                Either of you can make a wish for the other to grant.
              </Text>
            </View>
            <Button
              label="Make a wish ✨"
              onPress={() => router.push("/wish/new")}
            />
          </View>
        )}

        {/* ── Active wish ─────────────────────────────────────────── */}
        {activeWish && (
          <>
            <WishCard wish={activeWish} creatorName={wishCreatorName} />

            {/* Decline note visible to creator when on_hold */}
            {amCreator && activeWish.status === "on_hold" && (
              <DeclineNote wish={activeWish} />
            )}

            {/* ── TARGET actions (the one who needs to fulfill the wish) ── */}
            {amTarget && activeWish.status === "active" && (
              <View className="gap-3">
                <Button
                  label="Accept ✓"
                  onPress={handleAccept}
                  loading={updateWish.isPending}
                />
                {showDeclineInput ? (
                  <View className="gap-2">
                    <TextInput
                      value={declineText}
                      onChangeText={setDeclineText}
                      placeholder="Add a note (optional)"
                      placeholderTextColor="#9E8A9E"
                      maxLength={140}
                      multiline
                      className="bg-white dark:bg-bark-card border border-sand dark:border-[#3D2B3D] rounded-xl px-4 py-3 text-sm text-brown-deep dark:text-offwhite min-h-[72px]"
                    />
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Button label="Send" onPress={handleNotRightNow} loading={updateWish.isPending} />
                      </View>
                      <View className="flex-1">
                        <Button
                          label="Cancel"
                          onPress={() => { setShowDeclineInput(false); setDeclineText(""); }}
                          variant="ghost"
                          disabled={updateWish.isPending}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <Button
                    label="Not right now"
                    onPress={handleNotRightNow}
                    variant="ghost"
                    disabled={updateWish.isPending}
                  />
                )}
              </View>
            )}

            {amTarget && activeWish.status === "on_hold" && (
              <View className="gap-3">
                <Button
                  label="Accept ✓"
                  onPress={handleAccept}
                  loading={updateWish.isPending}
                />
                <Text className="text-xs text-brown-muted dark:text-[#8A7385] text-center">
                  You said "not right now" — you can still accept when ready.
                </Text>
              </View>
            )}

            {amTarget && activeWish.status === "accepted" && (
              <Button
                label="Mark as done ✓"
                onPress={handleMarkDone}
                loading={updateWish.isPending}
              />
            )}

            {amTarget && activeWish.status === "fulfilled" && (
              <View className="items-center py-2">
                <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center">
                  Waiting for {partnerFirst} to confirm.
                </Text>
              </View>
            )}

            {/* ── CREATOR actions (the one who made the wish) ── */}
            {amCreator && (
              <>
                <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-3 border border-sand dark:border-[#3D2B3D]">
                  <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
                    {creatorStatusLabel(activeWish.status)}
                  </Text>
                </View>

                {activeWish.status === "fulfilled" && (
                  <View className="gap-3">
                    {showThankYouInput ? (
                      <View className="gap-2">
                        <TextInput
                          value={thankYouNote}
                          onChangeText={setThankYouNote}
                          placeholder="Add a thank-you note (optional)"
                          placeholderTextColor="#9E8A9E"
                          maxLength={280}
                          multiline
                          className="bg-white dark:bg-bark-card border border-sand dark:border-[#3D2B3D] rounded-xl px-4 py-3 text-sm text-brown-deep dark:text-offwhite min-h-[72px]"
                        />
                        <View className="flex-row gap-2">
                          <View className="flex-1">
                            <Button label="Confirm ✓" onPress={handleConfirm} loading={updateWish.isPending} />
                          </View>
                          <View className="flex-1">
                            <Button
                              label="Cancel"
                              onPress={() => { setShowThankYouInput(false); setThankYouNote(""); }}
                              variant="ghost"
                              disabled={updateWish.isPending}
                            />
                          </View>
                        </View>
                      </View>
                    ) : (
                      <Button
                        label="Confirm & thank 🎉"
                        onPress={handleConfirm}
                        loading={updateWish.isPending}
                      />
                    )}
                  </View>
                )}

                {(activeWish.status === "active" || activeWish.status === "on_hold") && (
                  <Button
                    label="Withdraw wish"
                    onPress={handleWithdraw}
                    variant="ghost"
                    loading={updateWish.isPending}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* ── History ──────────────────────────────────────────────── */}
        {history && history.length > 0 && (
          <View className="gap-2 mt-2">
            <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
              Past wishes
            </Text>
            <View className="bg-white dark:bg-bark-card rounded-xl px-4 border border-sand dark:border-[#3D2B3D]">
              {history.slice(0, 5).map((w) => (
                <HistoryRow key={w.id} wish={w} />
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
