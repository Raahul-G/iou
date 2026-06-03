import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { useIOUs, useBalance, useScores, useUpdateIOUStatus, type IOU } from "@/hooks/use-ious";
import { useSetNickname } from "@/hooks/use-friends";
import { Button } from "@/components/ui/button";
import { CATEGORY_EMOJI } from "@/constants/app";

function IOUCard({
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

  const statusLabel = {
    pending: iAmCreator ? "Awaiting acceptance" : "Wants to owe you",
    accepted: iAmCreator ? "You owe this" : "They owe you",
    completion_requested: iAmCreator ? "Marked as done — awaiting confirmation" : "They say they did it",
    completed: "Completed",
    declined: "Declined",
  }[iou.status];

  const isActive = ["pending", "accepted", "completion_requested"].includes(iou.status);

  return (
    <View className={`rounded-xl px-4 py-4 gap-2 ${isActive ? "bg-white dark:bg-bark-card" : "bg-sand/30 dark:bg-[#160F16]"} border border-sand dark:border-[#3D2B3D]`}>
      <View className="flex-row items-start gap-3">
        <Text className="text-2xl">{emoji}</Text>
        <View className="flex-1">
          <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
            {iou.title}
          </Text>
          {iou.note && (
            <Text className="text-sm text-brown-muted dark:text-[#8A7385] mt-0.5">
              {iou.note}
            </Text>
          )}
          <Text className="text-xs text-brown-muted dark:text-[#8A7385] mt-1">
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Action buttons based on state + role */}
      {iou.status === "pending" && !iAmCreator && (
        <View className="flex-row gap-2 mt-1">
          <View className="flex-1">
            <Button label="Accept" onPress={() => onAction(iou.id, "accepted")} />
          </View>
          <View className="flex-1">
            <Button label="Decline" variant="ghost" onPress={() => onAction(iou.id, "declined")} />
          </View>
        </View>
      )}

      {iou.status === "accepted" && iAmCreator && (
        <Button
          label="Mark as done"
          variant="secondary"
          onPress={() => onAction(iou.id, "completion_requested")}
        />
      )}

      {iou.status === "completion_requested" && !iAmCreator && (
        <View className="flex-row gap-2 mt-1">
          <View className="flex-1">
            <Button label="Confirm ✓" onPress={() => onAction(iou.id, "completed")} />
          </View>
          <View className="flex-1">
            <Button label="Reject" variant="ghost" onPress={() => onAction(iou.id, "accepted")} />
          </View>
        </View>
      )}
    </View>
  );
}

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
  const { data: ious, isLoading, error: iouError, refetch, isRefetching } = useIOUs(id);
  const { data: balance } = useBalance(id);
  const { data: scores } = useScores(id);
  const updateStatus = useUpdateIOUStatus();
  const setNicknameMutation = useSetNickname();

  const [actionError, setActionError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameEditing, setNicknameEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(initNickname ?? "");
  const [currentNickname, setCurrentNickname] = useState<string | null>(
    initNickname || null
  );

  const isUserA = isUserAStr === "true";

  const active = (ious ?? []).filter((i) => i.status !== "completed" && i.status !== "declined");
  const history = (ious ?? []).filter((i) => i.status === "completed" || i.status === "declined");

  const handleAction = async (iouId: string, status: IOU["status"]) => {
    setActionError(null);
    try {
      await updateStatus.mutateAsync({ iouId, status, friendshipId: id });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    }
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

  return (
    <View className="flex-1 bg-cream dark:bg-bark">
      {/* Header */}
      <View className="px-5 pt-14 pb-4 border-b border-sand dark:border-[#3D2B3D]">
        <View className="flex-row items-center gap-3 mb-4">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text className="text-base text-brown-warm dark:text-umber">← Back</Text>
          </Pressable>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            {pic ? (
              <Image source={{ uri: pic }} className="w-12 h-12 rounded-full bg-sand" />
            ) : (
              <View className="w-12 h-12 rounded-full bg-sand dark:bg-[#3D2B3D] items-center justify-center">
                <Text className="text-xl">👤</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-lg font-semibold text-brown-deep dark:text-offwhite">
                {currentNickname || name}
              </Text>
              {balance && (
                <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
                  {balance.i_owe > 0 && `You owe ${balance.i_owe}`}
                  {balance.i_owe > 0 && balance.they_owe > 0 && " · "}
                  {balance.they_owe > 0 && `They owe ${balance.they_owe}`}
                  {balance.i_owe === 0 && balance.they_owe === 0 && "All settled up"}
                </Text>
              )}

              {/* Nickname edit */}
              {nicknameError && (
                <Text className="text-xs text-red-500 mt-1">{nicknameError}</Text>
              )}
              {nicknameEditing ? (
                <View className="flex-row items-center gap-2 mt-1.5">
                  <TextInput
                    value={nicknameInput}
                    onChangeText={setNicknameInput}
                    placeholder="Add a nickname…"
                    placeholderTextColor="#8C7676"
                    maxLength={30}
                    autoFocus
                    className="flex-1 text-xs text-brown-deep dark:text-offwhite bg-sand/50 dark:bg-[#3D2B3D] rounded-lg px-2.5 py-1.5 border border-sand dark:border-[#4A354A]"
                  />
                  <Pressable
                    onPress={() => saveNickname(nicknameInput.trim() || null)}
                    hitSlop={8}
                    disabled={setNicknameMutation.isPending}
                  >
                    <Text className="text-xs font-semibold text-brown-warm dark:text-umber">
                      Save
                    </Text>
                  </Pressable>
                  {currentNickname && (
                    <Pressable
                      onPress={() => { setNicknameInput(""); saveNickname(null); }}
                      hitSlop={8}
                    >
                      <Text className="text-xs text-red-400">Clear</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setNicknameEditing(false)} hitSlop={8}>
                    <Text className="text-xs text-brown-muted dark:text-[#8A7385]">Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setNicknameInput(currentNickname ?? "");
                    setNicknameEditing(true);
                  }}
                  hitSlop={8}
                  className="flex-row items-center gap-1 mt-1"
                >
                  <Text className="text-xs text-brown-muted dark:text-[#8A7385]">
                    {currentNickname ? `"${currentNickname}" ✏️` : "Add nickname ✏️"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/iou/new",
                params: { friendshipId: id, friendId, friendName: currentNickname || name },
              })
            }
            className="bg-brown-warm dark:bg-umber rounded-full px-4 py-2 ml-2"
          >
            <Text className="text-sm font-semibold text-white">+ IOU</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 py-4 gap-6"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Fun insight */}
        {scores && scores.this_month > 0 && (
          <View className="rounded-xl bg-brown-warm/10 dark:bg-umber/20 px-4 py-3 border border-brown-warm/20 dark:border-umber/30">
            <Text className="text-sm font-medium text-brown-warm dark:text-umber text-center">
              🎉 You've completed {scores.this_month} IOU{scores.this_month !== 1 ? "s" : ""} with {currentNickname || name} this month!
            </Text>
          </View>
        )}

        {actionError && (
          <Text className="text-sm text-red-500 dark:text-red-400">{actionError}</Text>
        )}

        {iouError ? (
          <View className="items-center mt-16 gap-2">
            <Text className="text-4xl">⚠️</Text>
            <Text className="text-base font-medium text-brown-deep dark:text-offwhite">
              Couldn't load IOUs
            </Text>
            <Pressable onPress={() => refetch()} className="mt-1">
              <Text className="text-sm text-brown-warm dark:text-umber">Try again</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <ActivityIndicator className="mt-10" />
        ) : (
          <>
            {/* Active IOUs */}
            {active.length > 0 && (
              <View className="gap-3">
                <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
                  Active
                </Text>
                {active.map((iou) => (
                  <IOUCard
                    key={iou.id}
                    iou={iou}
                    myId={user!.id}
                    onAction={handleAction}
                  />
                ))}
              </View>
            )}

            {/* History */}
            {history.length > 0 && (
              <View className="gap-3">
                <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
                  History
                </Text>
                {history.map((iou) => (
                  <IOUCard
                    key={iou.id}
                    iou={iou}
                    myId={user!.id}
                    onAction={handleAction}
                  />
                ))}
              </View>
            )}

            {active.length === 0 && history.length === 0 && (
              <View className="items-center mt-16 gap-2">
                <Text className="text-4xl">🤝</Text>
                <Text className="text-base font-medium text-brown-deep dark:text-offwhite">
                  No IOUs yet
                </Text>
                <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center">
                  Tap + IOU to create the first one.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
