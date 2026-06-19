import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import { debouncedPush } from "@/lib/navigation";
import { useIOUs, useScores, useUpdateIOUStatus, type IOU } from "@/hooks/use-ious";
import { useSetNickname } from "@/hooks/use-friends";
import { useFriendTree, friendTreeVisual } from "@/hooks/use-friend-tree";
import {
  useActiveWish,
  useWishHistory,
  useUpdateWishStatus,
  type Wish,
  type WishStatus,
} from "@/hooks/use-wishes";
import { Button } from "@/components/ui/button";
import { CATEGORY_EMOJI, WISH_MOODS } from "@/constants/app";

const MOOD_EMOJI: Record<string, string> = Object.fromEntries(
  WISH_MOODS.map((m) => [m.key, m.emoji])
);

function creatorStatusLabel(status: WishStatus): string {
  switch (status) {
    case "active":    return "Waiting for your friend to respond…";
    case "accepted":  return "They accepted — they'll let you know when it's done.";
    case "on_hold":   return "They said \"not right now\".";
    case "fulfilled": return "They say they've done it! Confirm below.";
    default:          return "";
  }
}

// ─── Wish history bubble ──────────────────────────────────────────────────────

function WishBubble({ wish }: { wish: Wish }) {
  const isConfirmed = wish.status === "confirmed";
  return (
    <View
      className={`flex-row items-center gap-3 rounded-2xl px-4 py-3 border ${
        isConfirmed
          ? "bg-white dark:bg-bark-card border-sand dark:border-[#3D2B3D]"
          : "bg-sand/20 dark:bg-[#160F16]/60 border-sand/40 dark:border-[#3D2B3D]/40"
      }`}
      style={isConfirmed ? undefined : { opacity: 0.6 }}
    >
      <Text>{MOOD_EMOJI[wish.mood] ?? "💌"}</Text>
      <Text className="flex-1 text-sm text-brown-deep dark:text-offwhite" numberOfLines={1}>
        {wish.text}
      </Text>
      <View className={`w-6 h-6 rounded-full items-center justify-center ${
        isConfirmed ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-sand dark:bg-[#3D2B3D]"
      }`}>
        <Text className={`text-xs font-bold ${
          isConfirmed ? "text-emerald-600 dark:text-emerald-400" : "text-brown-muted dark:text-[#8A7385]"
        }`}>
          {isConfirmed ? "✓" : "✕"}
        </Text>
      </View>
    </View>
  );
}

// ─── Compact IOU row for Zone 3 ───────────────────────────────────────────────

function IOURow({
  iou,
  myId,
  onAction,
}: {
  iou: IOU;
  myId: string;
  onAction: (id: string, status: IOU["status"]) => void;
}) {
  const iAmCreator = iou.creator_id === myId;
  const emoji = iou.category ? (CATEGORY_EMOJI[iou.category] ?? "✨") : "✨";
  const isActive = ["pending", "accepted", "completion_requested"].includes(iou.status);

  const statusLabel = {
    pending: iAmCreator ? "Awaiting acceptance" : "Wants to owe you",
    accepted: iAmCreator ? "You owe this" : "They owe you",
    completion_requested: iAmCreator ? "Marked as done" : "They say they did it",
    completed: "Completed",
    declined: "Declined",
  }[iou.status];

  const isCompleted = iou.status === "completed";

  return (
    <View
      className={`rounded-2xl px-4 py-3 border gap-2 ${
        isActive
          ? "bg-white dark:bg-bark-card border-sand dark:border-[#3D2B3D]"
          : isCompleted
          ? "bg-white dark:bg-bark-card border-sand dark:border-[#3D2B3D]"
          : "bg-sand/20 dark:bg-[#160F16]/60 border-sand/40 dark:border-[#3D2B3D]/40"
      }`}
      style={!isActive && !isCompleted ? { opacity: 0.6 } : undefined}
    >
      <View className="flex-row items-center gap-3">
        <Text className="text-xl">{emoji}</Text>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-brown-deep dark:text-offwhite" numberOfLines={1}>
            {iou.title}
          </Text>
          {isActive && (
            <Text className="text-xs text-brown-muted dark:text-[#8A7385] mt-0.5">
              {statusLabel}
            </Text>
          )}
        </View>
        {!isActive && (
          <View className={`w-6 h-6 rounded-full items-center justify-center ${
            isCompleted
              ? "bg-emerald-50 dark:bg-emerald-950/40"
              : "bg-sand dark:bg-[#3D2B3D]"
          }`}>
            <Text className={`text-xs font-bold ${
              isCompleted
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-brown-muted dark:text-[#8A7385]"
            }`}>
              {isCompleted ? "✓" : "✕"}
            </Text>
          </View>
        )}
      </View>

      {iou.status === "pending" && !iAmCreator && (
        <View className="flex-row gap-2">
          <View className="flex-1"><Button label="Accept" onPress={() => onAction(iou.id, "accepted")} /></View>
          <View className="flex-1"><Button label="Decline" variant="ghost" onPress={() => onAction(iou.id, "declined")} /></View>
        </View>
      )}
      {iou.status === "accepted" && iAmCreator && (
        <Button label="Mark as done" variant="secondary" onPress={() => onAction(iou.id, "completion_requested")} />
      )}
      {iou.status === "completion_requested" && !iAmCreator && (
        <View className="flex-row gap-2">
          <View className="flex-1"><Button label="Confirm ✓" onPress={() => onAction(iou.id, "completed")} /></View>
          <View className="flex-1"><Button label="Reject" variant="ghost" onPress={() => onAction(iou.id, "accepted")} /></View>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FriendDetail() {
  const { id, name, pic, friendId, nickname: initNickname, isUserA: isUserAStr } =
    useLocalSearchParams<{
      id: string;
      name: string;
      pic?: string;
      friendId: string;
      nickname?: string;
      isUserA?: string;
    }>();

  const { user } = useAuthStore();
  const isUserA = isUserAStr === "true";
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  // Guard against missing route params or unauthenticated state
  if (!id || !friendId || !user) {
    router.replace("/");
    return null;
  }

  // ── Data ──────────────────────────────────────────────────────────
  const {
    data: ious,
    isLoading: iousLoading,
    error: iouError,
    refetch: refetchIOUs,
    isRefetching,
  } = useIOUs(id);
  const { data: scores } = useScores(id);
  const { data: treeScore, isLoading: treeLoading } = useFriendTree({
    friendshipId: id,
    myId: user.id,
    friendId,
    isUserA,
  });
  const { data: activeWish, isLoading: wishLoading } = useActiveWish(id);
  const { data: wishHistory } = useWishHistory(id);

  // ── Mutations ─────────────────────────────────────────────────────
  const updateIOUStatus = useUpdateIOUStatus();
  const updateWish = useUpdateWishStatus();
  const setNicknameMutation = useSetNickname();

  // ── UI state ──────────────────────────────────────────────────────
  const [actionError, setActionError] = useState<string | null>(null);
  const [wishActionError, setWishActionError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameEditing, setNicknameEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(initNickname ?? "");
  const [currentNickname, setCurrentNickname] = useState<string | null>(initNickname || null);
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineText, setDeclineText] = useState("");
  const [showThankYouInput, setShowThankYouInput] = useState(false);
  const [thankYouNote, setThankYouNote] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [iouPageLimit, setIouPageLimit] = useState(20);

  // ── Tree visual ───────────────────────────────────────────────────
  const isNew = scores?.all_time === 0;
  const { emoji: treeEmoji, label: treeLabel } = friendTreeVisual(
    treeLoading ? undefined : treeScore,
    isNew ?? true
  );
  const myEmoji     = treeScore?.myEmoji     ?? "💧";
  const friendEmoji = treeScore?.friendEmoji ?? "🌿";

  // ── Wish role ─────────────────────────────────────────────────────
  const amCreator = !!activeWish && activeWish.creator_id === user?.id;
  const amTarget  = !!activeWish && activeWish.target_id  === user?.id;

  const mutateWish = async (action: Parameters<typeof updateWish.mutateAsync>[0]): Promise<boolean> => {
    setWishActionError(null);
    try { await updateWish.mutateAsync(action); return true; }
    catch (err: unknown) { setWishActionError(err instanceof Error ? err.message : "Something went wrong."); return false; }
  };

  const handleWishAccept      = () => mutateWish({ wishId: activeWish!.id, friendshipId: id, action: "accept" });
  const handleWishMarkDone    = () => mutateWish({ wishId: activeWish!.id, friendshipId: id, action: "mark_done" });
  const handleWishNotRightNow = async () => {
    if (!showDeclineInput) { setShowDeclineInput(true); return; }
    const ok = await mutateWish({ wishId: activeWish!.id, friendshipId: id, action: "not_right_now", decline_text: declineText.trim() || undefined });
    if (ok) { setShowDeclineInput(false); setDeclineText(""); }
  };
  const handleWishWithdraw = () => {
    const go = () => mutateWish({ wishId: activeWish!.id, friendshipId: id, action: "withdraw" });
    if (Platform.OS === "web") { if (window.confirm("Withdraw this wish?")) go(); return; }
    Alert.alert("Withdraw wish?", "The wish will be removed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Withdraw", style: "destructive", onPress: go },
    ]);
  };
  const handleWishConfirm = async () => {
    if (!showThankYouInput) { setShowThankYouInput(true); return; }
    const ok = await mutateWish({ wishId: activeWish!.id, friendshipId: id, action: "confirm", thank_you_note: thankYouNote.trim() || undefined });
    if (ok) { setShowThankYouInput(false); setThankYouNote(""); }
  };

  // ── IOU helpers ───────────────────────────────────────────────────
  const handleIOUAction = async (iouId: string, status: IOU["status"]) => {
    setActionError(null);
    try { await updateIOUStatus.mutateAsync({ iouId, status, friendshipId: id }); }
    catch (err: unknown) { setActionError(err instanceof Error ? err.message : "Action failed."); }
  };

  const saveNickname = async (value: string | null) => {
    setNicknameError(null);
    try {
      await setNicknameMutation.mutateAsync({ friendshipId: id, nickname: value, isUserA });
      setCurrentNickname(value);
      setNicknameEditing(false);
    } catch (err: unknown) {
      setNicknameError(err instanceof Error ? err.message : "Failed to save nickname.");
    }
  };

  // ── IOU list ──────────────────────────────────────────────────────
  const activeIOUs  = (ious ?? []).filter((i) => !["completed", "declined"].includes(i.status));
  const historyIOUs = (ious ?? []).filter((i) => ["completed", "declined"].includes(i.status));
  const allIOUs     = [...activeIOUs, ...historyIOUs];
  const visibleIOUs = showAllHistory ? allIOUs.slice(0, iouPageLimit) : allIOUs.slice(0, 3);

  const displayName = currentNickname || name;
  const friendFirst = (displayName ?? "").split(" ")[0];
  const wishNewParams = { friendshipId: id, targetId: friendId, friendName: displayName };

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-bark"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchIOUs} />}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <View className="px-5 pb-6 border-b border-sand dark:border-[#3D2B3D] items-center" style={{ paddingTop: insets.top + 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} className="self-start mb-5" accessibilityRole="button" accessibilityLabel="Go back">
          <Text className="text-base text-brown-warm dark:text-umber">Back</Text>
        </Pressable>

        {/* Avatar */}
        {pic ? (
          <Image source={{ uri: pic }} className="w-24 h-24 rounded-full bg-sand mb-4" />
        ) : (
          <View className="w-24 h-24 rounded-full bg-brown-warm/20 dark:bg-umber/20 items-center justify-center mb-4">
            <Text className="text-4xl font-bold text-brown-warm dark:text-umber">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Name + pencil */}
        {nicknameEditing ? (
          <View className="items-center gap-2 w-full">
            <View className="flex-row items-center gap-3">
              <TextInput
                value={nicknameInput}
                onChangeText={setNicknameInput}
                placeholder="Add a nickname…"
                placeholderTextColor={colorScheme === "dark" ? "#9E8A9E" : "#8C7676"}
                maxLength={30}
                autoFocus
                className="text-xl font-bold text-brown-deep dark:text-offwhite bg-sand/50 dark:bg-[#3D2B3D] rounded-xl px-4 py-2 border border-sand dark:border-[#4A354A] text-center"
              />
            </View>
            <View className="flex-row items-center gap-4">
              <Pressable onPress={() => saveNickname(nicknameInput.trim() || null)} hitSlop={8} disabled={setNicknameMutation.isPending}>
                <Text className="text-sm font-semibold text-brown-warm dark:text-umber">Save</Text>
              </Pressable>
              {currentNickname && (
                <Pressable onPress={() => { setNicknameInput(""); saveNickname(null); }} hitSlop={8}>
                  <Text className="text-sm text-red-400">Clear</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setNicknameEditing(false)} hitSlop={8}>
                <Text className="text-sm text-brown-muted dark:text-[#8A7385]">Cancel</Text>
              </Pressable>
            </View>
            {nicknameError && <Text className="text-xs text-red-500">{nicknameError}</Text>}
          </View>
        ) : (
          <Pressable
            onPress={() => { setNicknameInput(currentNickname ?? ""); setNicknameEditing(true); }}
            hitSlop={8}
            className="flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel={`Edit nickname for ${displayName}`}
          >
            <Text className="text-2xl font-bold text-brown-deep dark:text-offwhite">{displayName}</Text>
            <Text className="text-lg ml-3 opacity-50">✏️</Text>
          </Pressable>
        )}
      </View>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Zone 1 — Tree                                               */}
      {/* ════════════════════════════════════════════════════════════ */}
      <View className="items-center px-5 py-8 gap-3">
        <Text style={{ fontSize: 64, lineHeight: 76 }}>{treeEmoji}</Text>
        <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
          {treeLabel}
        </Text>

        {!treeLoading && treeScore && (
          <View className="flex-row mt-1 bg-sand/50 dark:bg-[#160F16]/70 rounded-2xl overflow-hidden w-full">
            <View className="flex-1 items-center py-3 gap-0.5">
              <Text className="text-2xl font-bold text-brown-deep dark:text-offwhite">
                {treeScore.myScore}
              </Text>
              <Text className="text-xs text-brown-muted dark:text-[#8A7385]">
                You {myEmoji}
              </Text>
            </View>
            <View className="bg-sand dark:bg-[#3D2B3D] my-3" style={{ width: StyleSheet.hairlineWidth }} />
            <View className="flex-1 items-center py-3 gap-0.5">
              <Text className="text-2xl font-bold text-brown-deep dark:text-offwhite">
                {treeScore.friendScore}
              </Text>
              <Text className="text-xs text-brown-muted dark:text-[#8A7385]">
                {friendFirst} {friendEmoji}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className="bg-sand dark:bg-[#3D2B3D] mx-5" style={{ height: StyleSheet.hairlineWidth }} />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Zone 2 — IOUs                                               */}
      {/* ════════════════════════════════════════════════════════════ */}
      <View className="px-5 py-6 gap-4">
        <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
          IOUs
        </Text>

        {/* Action pill */}
        <Pressable
          onPress={() => debouncedPush({ pathname: "/iou/new", params: { friendshipId: id, friendId, friendName: displayName } })}
          className="items-center justify-center bg-brown-warm dark:bg-umber rounded-2xl py-3 active:opacity-75"
          accessibilityRole="button"
          accessibilityLabel="New IOU"
        >
          <Text className="text-white text-sm font-semibold">+ New IOU</Text>
        </Pressable>

        {/* Celebration pill */}
        {scores && scores.this_month > 0 && (
          <View className="items-center">
            <View className="bg-brown-warm/15 dark:bg-umber/20 rounded-full px-5 py-2.5 flex-row items-center gap-2">
              <Text>🎉</Text>
              <Text className="text-xs font-semibold text-brown-warm dark:text-umber">
                {scores.this_month} IOU{scores.this_month !== 1 ? "s" : ""} completed this month
              </Text>
            </View>
          </View>
        )}

        {actionError && (
          <Text className="text-sm text-red-500 dark:text-red-400">{actionError}</Text>
        )}

        {/* IOU list */}
        {iouError ? (
          <View className="items-center mt-4 gap-2">
            <Text className="text-4xl">⚠️</Text>
            <Text className="text-base font-medium text-brown-deep dark:text-offwhite">Couldn't load IOUs</Text>
            <Pressable onPress={() => refetchIOUs()} className="mt-1">
              <Text className="text-sm text-brown-warm dark:text-umber">Try again</Text>
            </Pressable>
          </View>
        ) : iousLoading ? (
          <ActivityIndicator className="mt-4" />
        ) : allIOUs.length === 0 ? (
          <View className="items-center gap-4 py-6">
            <Text style={{ fontSize: 48 }}>🫶</Text>
            <View className="items-center gap-1">
              <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
                All square for now.
              </Text>
              <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center px-4">
                Next time a favour happens — big or small — log it here and keep the friendship honest.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View className="gap-3">
              {visibleIOUs.map((iou) => (
                <IOURow key={iou.id} iou={iou} myId={user.id} onAction={handleIOUAction} />
              ))}
            </View>
            {allIOUs.length > 3 && !showAllHistory && (
              <Pressable onPress={() => { setShowAllHistory(true); setIouPageLimit(20); }} className="items-center py-2">
                <Text className="text-sm text-brown-warm dark:text-umber font-medium">
                  {`View all ${allIOUs.length} IOUs →`}
                </Text>
              </Pressable>
            )}
            {showAllHistory && iouPageLimit < allIOUs.length && (
              <Pressable onPress={() => setIouPageLimit((v) => v + 20)} className="items-center py-2">
                <Text className="text-sm text-brown-warm dark:text-umber font-medium">
                  Show more ({allIOUs.length - iouPageLimit} remaining)
                </Text>
              </Pressable>
            )}
            {showAllHistory && (
              <Pressable onPress={() => { setShowAllHistory(false); setIouPageLimit(20); }} className="items-center py-2">
                <Text className="text-sm text-brown-warm dark:text-umber font-medium">
                  Show less
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>

      <View className="bg-sand dark:bg-[#3D2B3D] mx-5" style={{ height: StyleSheet.hairlineWidth }} />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Zone 3 — Active Wish                                        */}
      {/* ════════════════════════════════════════════════════════════ */}
      <View className="px-5 py-6 gap-4">
        <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
          Wish
        </Text>

        {wishActionError && (
          <Text className="text-sm text-red-500 text-center">{wishActionError}</Text>
        )}

        {wishLoading ? (
          <ActivityIndicator />
        ) : activeWish ? (
          <>
            {/* Wish card */}
            <View className="bg-white dark:bg-bark-card rounded-2xl px-4 py-5 border border-sand dark:border-[#3D2B3D] gap-3">
              <View className="flex-row items-center gap-2">
                <Text style={{ fontSize: 22 }}>{MOOD_EMOJI[activeWish.mood] ?? "💌"}</Text>
                <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
                  {amTarget ? `A wish from ${friendFirst}` : "Your wish"}
                </Text>
              </View>
              <Text className="text-base text-brown-deep dark:text-offwhite leading-relaxed">
                {activeWish.text}
              </Text>
            </View>

            {/* Decline note (creator, on_hold) */}
            {amCreator && activeWish.status === "on_hold" && activeWish.decline_text && (
              <View className="bg-sand/30 dark:bg-[#160F16] rounded-2xl px-4 py-3 gap-1">
                <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
                  Their note
                </Text>
                <Text className="text-sm text-brown-deep dark:text-offwhite">
                  {activeWish.decline_mood ? `${MOOD_EMOJI[activeWish.decline_mood]} ` : ""}
                  {activeWish.decline_text}
                </Text>
              </View>
            )}

            {/* Target actions */}
            {amTarget && activeWish.status === "active" && (
              <View className="gap-3">
                <Button label="Accept ✓" onPress={handleWishAccept} loading={updateWish.isPending} />
                {showDeclineInput ? (
                  <View className="gap-2">
                    <TextInput
                      value={declineText} onChangeText={setDeclineText}
                      placeholder="Add a note (optional)" placeholderTextColor={colorScheme === "dark" ? "#9E8A9E" : "#8C7676"}
                      maxLength={140} multiline
                      className="bg-white dark:bg-bark-card border border-sand dark:border-[#3D2B3D] rounded-xl px-4 py-3 text-sm text-brown-deep dark:text-offwhite min-h-[72px]"
                    />
                    <View className="flex-row gap-2">
                      <View className="flex-1"><Button label="Send" onPress={handleWishNotRightNow} loading={updateWish.isPending} /></View>
                      <View className="flex-1"><Button label="Cancel" onPress={() => { setShowDeclineInput(false); setDeclineText(""); }} variant="ghost" /></View>
                    </View>
                  </View>
                ) : (
                  <Button label="Not right now" onPress={handleWishNotRightNow} variant="ghost" disabled={updateWish.isPending} />
                )}
              </View>
            )}

            {amTarget && activeWish.status === "on_hold" && (
              <View className="gap-2">
                <Button label="Accept ✓" onPress={handleWishAccept} loading={updateWish.isPending} />
                <Text className="text-xs text-brown-muted dark:text-[#8A7385] text-center">
                  You said "not right now" — you can still accept.
                </Text>
              </View>
            )}

            {amTarget && activeWish.status === "accepted" && (
              <Button label="Mark as done ✓" onPress={handleWishMarkDone} loading={updateWish.isPending} />
            )}

            {amTarget && activeWish.status === "fulfilled" && (
              <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center py-2">
                Waiting for {friendFirst} to confirm.
              </Text>
            )}

            {/* Creator actions */}
            {amCreator && (
              <>
                <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-3 border border-sand dark:border-[#3D2B3D]">
                  <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
                    {creatorStatusLabel(activeWish.status)}
                  </Text>
                </View>

                {activeWish.status === "fulfilled" && (
                  showThankYouInput ? (
                    <View className="gap-2">
                      <TextInput
                        value={thankYouNote} onChangeText={setThankYouNote}
                        placeholder="Add a thank-you note (optional)" placeholderTextColor={colorScheme === "dark" ? "#9E8A9E" : "#8C7676"}
                        maxLength={280} multiline
                        className="bg-white dark:bg-bark-card border border-sand dark:border-[#3D2B3D] rounded-xl px-4 py-3 text-sm text-brown-deep dark:text-offwhite min-h-[72px]"
                      />
                      <View className="flex-row gap-2">
                        <View className="flex-1"><Button label="Confirm ✓" onPress={handleWishConfirm} loading={updateWish.isPending} /></View>
                        <View className="flex-1"><Button label="Cancel" onPress={() => { setShowThankYouInput(false); setThankYouNote(""); }} variant="ghost" /></View>
                      </View>
                    </View>
                  ) : (
                    <Button label="Confirm & thank 🎉" onPress={handleWishConfirm} loading={updateWish.isPending} />
                  )
                )}

                {(activeWish.status === "active" || activeWish.status === "on_hold") && (
                  <Button label="Withdraw wish" onPress={handleWishWithdraw} variant="ghost" loading={updateWish.isPending} />
                )}
              </>
            )}

            {/* Past wishes */}
            {wishHistory && wishHistory.length > 0 && (
              <View className="gap-2 mt-2">
                <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
                  Past wishes
                </Text>
                <View className="gap-2">
                  {wishHistory.slice(0, 3).map((w) => <WishBubble key={w.id} wish={w} />)}
                </View>
              </View>
            )}
          </>
        ) : (
          /* No active wish */
          <View className="items-center gap-4 py-4">
            <Text style={{ fontSize: 48 }}>💌</Text>
            <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center">
              No active wish. Make one for {friendFirst} to grant.
            </Text>
            <Pressable
              onPress={() => debouncedPush({ pathname: "/wish/new", params: wishNewParams })}
              className="rounded-2xl px-6 py-3 bg-brown-warm dark:bg-umber active:opacity-75"
              style={styles.wishGlow}
              accessibilityRole="button"
              accessibilityLabel="Plant a wish"
            >
              <Text className="text-sm font-semibold text-white">Plant a wish ✨</Text>
            </Pressable>

            {wishHistory && wishHistory.length > 0 && (
              <View className="gap-2 w-full mt-2">
                <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
                  Past wishes
                </Text>
                <View className="gap-2">
                  {wishHistory.slice(0, 3).map((w) => <WishBubble key={w.id} wish={w} />)}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wishGlow: {
    shadowColor: "#D4A5A5",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },
});
