import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeIn, FadeOut, SlideInRight, ZoomIn } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useAuthStore } from "@/store/auth.store";
import { useUpdateProfile } from "@/hooks/use-profile";
import { TreeFigure } from "@/components/tree/tree-figure";
import { CenterPop, ParticleBurst, burstRing } from "@/components/celebrations/particles";
import { captureError } from "@/lib/analytics";

const STORAGE_PREFIX = "iou_onboarding_v1_done";

// ─── Slide artwork ────────────────────────────────────────────────────────────

function WelcomeArt() {
  return (
    <View className="items-center justify-center" style={{ width: 150, height: 140 }}>
      <View style={StyleSheet.absoluteFill} className="items-center justify-center">
        <ParticleBurst
          particles={burstRing(["star", "petal"], ["#E7C463", "#E8A9A9", "#A8C99B"], 8, 80, { sizeBase: 11 })}
        />
      </View>
      <CenterPop>
        <TreeFigure stage="healthy" size={130} />
      </CenterPop>
    </View>
  );
}

function IouArt() {
  return (
    <CenterPop>
      <Svg width={120} height={120} viewBox="0 0 96 96">
        {/* Envelope */}
        <Path d="M12 30 L48 12 L84 30 L84 74 Q84 78 80 78 L16 78 Q12 78 12 74 Z" fill="#9E6060" />
        <Path d="M16 32 L48 17 L80 32 L80 73 Q80 75 78 75 L18 75 Q16 75 16 73 Z" fill="#E8A9A9" />
        <Path d="M16 34 L48 56 L80 34 L80 40 L48 62 L16 40 Z" fill="#9E6060" opacity={0.45} />
        {/* Heart seal */}
        <Path
          d="M48 66 C42 61 39 58 39 54.5 C39 51.5 41.5 49 44.5 49 C46 49 47.3 49.8 48 51 C48.7 49.8 50 49 51.5 49 C54.5 49 57 51.5 57 54.5 C57 58 54 61 48 66 Z"
          fill="#FFF7EF"
        />
      </Svg>
    </CenterPop>
  );
}

function WishArt() {
  return (
    <CenterPop>
      <Svg width={120} height={120} viewBox="0 0 96 96">
        {/* Star wand */}
        <Path d="M30 82 L58 40" stroke="#8B572A" strokeWidth={6} strokeLinecap="round" />
        <Path d="M62 14 L67 31 L84 36 L67 41 L62 58 L57 41 L40 36 L57 31 Z" fill="#E7C463" />
        <Path d="M62 22 L65.5 33 L76 36 L65.5 39 L62 50 L58.5 39 L48 36 L58.5 33 Z" fill="#F3DFA0" />
        <Path d="M32 24 L34 30 L40 32 L34 34 L32 40 L30 34 L24 32 L30 30 Z" fill="#E8A9A9" />
        <Path d="M78 58 L79.5 62.5 L84 64 L79.5 65.5 L78 70 L76.5 65.5 L72 64 L76.5 62.5 Z" fill="#A8C99B" />
      </Svg>
    </CenterPop>
  );
}

function TreeGrowthArt() {
  // The three growth stages side by side — the story of the whole app in one row
  return (
    <View className="flex-row items-end justify-center gap-1">
      <Animated.View entering={ZoomIn.delay(100).springify().damping(12)}>
        <TreeFigure stage="seed" size={64} animated={false} />
      </Animated.View>
      <Animated.View entering={ZoomIn.delay(350).springify().damping(12)}>
        <TreeFigure stage="sprout" size={84} animated={false} />
      </Animated.View>
      <Animated.View entering={ZoomIn.delay(600).springify().damping(12)}>
        <TreeFigure stage="healthy" size={116} />
      </Animated.View>
    </View>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    Art: WelcomeArt,
    title: "Welcome to IOU",
    body: "Little things, remembered. Track the favours and kindnesses between you and your friends — privately.",
  },
  {
    Art: IouArt,
    title: "Send an IOU",
    body: "Owe someone a coffee or a favour? Log it as an IOU. Completing it keeps the friendship honest — and earns a tree point.",
  },
  {
    Art: WishArt,
    title: "Plant a wish",
    body: "Wish for a little kindness from a friend. When they grant it and you confirm, they earn double points.",
  },
  {
    Art: TreeGrowthArt,
    title: "Grow your tree",
    body: "Completing an IOU earns 1 point. Confirming a wish earns 2. Points run on a 14-day rolling window — and to stay alive, neither of you can fall below half the other's score. Start by adding your first friend!",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingTour() {
  const { user, profile } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const storageKey = user ? `${STORAGE_PREFIX}:${user.id}` : null;

  // The account (profiles.onboarding_completed_at) is the source of truth, so
  // the tour is one-time per user — across reinstalls, ports, and devices.
  // The device flag remains as an offline suppressor and pre-migration legacy.
  useEffect(() => {
    if (!storageKey || !profile) return; // wait for the profile before deciding
    if (profile.onboarding_completed_at) return; // account has seen it

    let cancelled = false;
    AsyncStorage.getItem(storageKey)
      .then((done) => {
        if (cancelled) return;
        if (done) {
          // Completed on this device before the account flag existed — sync up
          updateProfile.mutate({ onboarding_completed_at: new Date().toISOString() });
          return;
        }
        setVisible(true);
      })
      .catch((err) => {
        // If storage is unreadable, skip the tour rather than nagging every launch
        captureError(err instanceof Error ? err : new Error(String(err)), { flow: "onboarding_flag" });
      });
    return () => {
      cancelled = true;
    };
    // updateProfile (useMutation result) is a new object every render — including
    // it would re-run this effect constantly. Same pattern as notifications.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, profile]);

  const finish = () => {
    setVisible(false);
    if (storageKey) {
      AsyncStorage.setItem(storageKey, "1").catch((err) =>
        captureError(err instanceof Error ? err : new Error(String(err)), { flow: "onboarding_flag" })
      );
    }
    updateProfile.mutate(
      { onboarding_completed_at: new Date().toISOString() },
      {
        onError: (err) =>
          captureError(err instanceof Error ? err : new Error(String(err)), { flow: "onboarding_flag" }),
      }
    );
  };

  const isLast = step === STEPS.length - 1;
  const { Art, title, body } = STEPS[step];

  return (
    // Modal mounts on its own native window/dialog — guaranteed to render above
    // the react-native-screens navigator and to capture all touches while shown.
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={finish}>
      {visible && (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(200)}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        >
          <View className="flex-1 items-center justify-center px-8">
            <View
              className="w-full max-w-[400px] bg-white dark:bg-bark-card rounded-3xl border border-sand dark:border-[#3D2B3D] px-7 pt-9 pb-6 items-center"
              style={styles.cardShadow}
            >
              {/* Slide content — keyed so each step animates in fresh.
                  Styling lives on the inner plain View: NativeWind classes
                  don't apply reliably to Reanimated components. */}
              <Animated.View key={step} entering={SlideInRight.springify().damping(16)}>
                <View className="items-center">
                  <View className="h-40 items-center justify-center">
                    <Art />
                  </View>
                  <Text className="text-2xl font-bold text-brown-deep dark:text-offwhite mt-5 text-center">
                    {title}
                  </Text>
                  <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center leading-relaxed mt-2 min-h-[80px]">
                    {body}
                  </Text>
                </View>
              </Animated.View>

              {/* Progress dots */}
              <View className="flex-row gap-2 mt-2 mb-5">
                {STEPS.map((_, i) => (
                  <View
                    key={i}
                    className={`rounded-full ${
                      i === step ? "bg-brown-warm dark:bg-umber w-5" : "bg-sand dark:bg-[#3D2B3D] w-2"
                    } h-2`}
                  />
                ))}
              </View>

              {/* Actions */}
              <Pressable
                onPress={() => (isLast ? finish() : setStep((s) => s + 1))}
                className="w-full items-center bg-brown-warm dark:bg-umber rounded-2xl py-3.5 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel={isLast ? "Get started" : "Next"}
              >
                <Text className="text-base font-semibold text-white">
                  {isLast ? "Get started" : "Next"}
                </Text>
              </Pressable>
              {!isLast && (
                <Pressable onPress={finish} className="py-3" hitSlop={8} accessibilityRole="button" accessibilityLabel="Skip tour">
                  <Text className="text-sm text-brown-muted dark:text-[#8A7385]">Skip</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(30, 21, 30, 0.5)",
  },
  cardShadow: {
    shadowColor: "#3D2E2E",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
});
