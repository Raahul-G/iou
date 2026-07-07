import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import {
  useCelebrationStore,
  type Celebration,
  type CelebrationKind,
} from "@/store/celebration.store";
import { maybeRequestReview } from "@/lib/app-review";
import { burstRing, CenterPop, ParticleBurst, type ParticleSpec } from "./particles";

const AUTO_DISMISS_MS = 2800;

// Success moments that qualify as "moment of delight" for the Play rating prompt
const REVIEW_WORTHY: CelebrationKind[] = ["iou_completed", "wish_confirmed"];

// Shared palette — same family as the tree and the app theme
const C = {
  rose: "#E8A9A9",
  roseDeep: "#9E6060",
  sand: "#F0DCDC",
  leaf: "#7FAF6E",
  leafLight: "#A8C99B",
  gold: "#E7C463",
  soil: "#8B572A",
  cream: "#FFF7EF",
} as const;

// ─── Hero artwork (one per celebration kind, 96×96 viewBox) ───────────────────

function PlaneHero() {
  return (
    <Svg width={88} height={88} viewBox="0 0 96 96">
      <Path d="M10 52 L86 24 L58 78 L46 58 Z" fill={C.roseDeep} />
      <Path d="M14 50 L82 26 L56 72 L46 56 Z" fill={C.rose} />
      <Path d="M46 58 L58 78 L52 60 Z" fill={C.sand} />
      <Path d="M46 56 L82 26 L52 60 Z" fill={C.cream} opacity={0.5} />
    </Svg>
  );
}

function HeartSealHero() {
  return (
    <Svg width={88} height={88} viewBox="0 0 96 96">
      <Path
        d="M48 84 C24 64 12 50 12 36 C12 24 21 15 33 15 C39 15 45 18 48 24 C51 18 57 15 63 15 C75 15 84 24 84 36 C84 50 72 64 48 84 Z"
        fill={C.roseDeep}
      />
      <Path
        d="M48 78 C27 60 17 48 17 36 C17 27 24 20 33 20 C39 20 44 23 48 29 C52 23 57 20 63 20 C72 20 79 27 79 36 C79 48 69 60 48 78 Z"
        fill={C.rose}
      />
      <Path d="M35 47 L45 57 L63 37" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function SeedHero() {
  return (
    <Svg width={88} height={88} viewBox="0 0 96 96">
      <Ellipse cx={48} cy={78} rx={30} ry={8} fill={C.soil} opacity={0.35} />
      <Path d="M22 78 Q48 56 74 78 Z" fill={C.soil} />
      <Path d="M27 78 Q48 60 69 78 Z" fill="#B98A5E" />
      <Ellipse cx={48} cy={62} rx={8} ry={10} fill="#6E4420" />
      <Ellipse cx={46} cy={60} rx={5.5} ry={7.5} fill={C.soil} />
      <Path d="M48 52 Q48 40 56 34" stroke={C.leaf} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M56 36 C68 32 72 22 70 18 C60 21 55 27 56 36 Z" fill={C.leaf} />
      <Path d="M48 44 C38 42 34 34 36 30 C44 33 48 37 48 44 Z" fill={C.leafLight} />
    </Svg>
  );
}

function DropletHero() {
  return (
    <Svg width={88} height={88} viewBox="0 0 96 96">
      {/* Leaf cradle */}
      <Path d="M14 66 C34 78 62 78 82 66 C70 88 26 88 14 66 Z" fill={C.leaf} />
      <Path d="M20 68 C36 76 60 76 76 68 C66 84 30 84 20 68 Z" fill={C.leafLight} />
      {/* Droplet */}
      <Path d="M48 14 C58 30 66 40 66 50 C66 60 58 68 48 68 C38 68 30 60 30 50 C30 40 38 30 48 14 Z" fill="#7FB4D8" />
      <Path d="M48 22 C55 34 61 42 61 50 C61 57 55 63 48 63 Z" fill="#A9CDE8" />
      <Circle cx={41} cy={48} r={4} fill="#D6E9F5" />
    </Svg>
  );
}

function SparkleGiftHero() {
  return (
    <Svg width={88} height={88} viewBox="0 0 96 96">
      <Path d="M48 8 L54 34 L80 40 L54 46 L48 72 L42 46 L16 40 L42 34 Z" fill={C.gold} />
      <Path d="M48 18 L52 36 L70 40 L52 44 L48 62 L44 44 L26 40 L44 36 Z" fill="#F3DFA0" />
      <Path d="M74 62 L77 71 L86 74 L77 77 L74 86 L71 77 L62 74 L71 71 Z" fill={C.rose} />
      <Path d="M20 58 L22.5 65 L29 67.5 L22.5 70 L20 77 L17.5 70 L11 67.5 L17.5 65 Z" fill={C.leafLight} />
    </Svg>
  );
}

function FriendsHero() {
  return (
    <Svg width={88} height={88} viewBox="0 0 96 96">
      {/* Two interlocking paper-cut hearts */}
      <Path
        d="M38 74 C20 60 12 50 12 40 C12 31 19 24 28 24 C32 24 36 26 38 30 C40 26 44 24 48 24 C57 24 64 31 64 40 C64 50 56 60 38 74 Z"
        fill={C.roseDeep}
        opacity={0.9}
      />
      <Path
        d="M58 78 C42 66 34 56 34 47 C34 39 40 33 48 33 C51 33 55 35 58 38 C61 35 65 33 68 33 C76 33 82 39 82 47 C82 56 74 66 58 78 Z"
        fill={C.rose}
      />
      <Path
        d="M58 71 C46 61 39 53 39 47 C39 42 43 38 48 38 C51 38 55 40 58 44 C61 40 65 38 68 38 C73 38 77 42 77 47 C77 53 70 61 58 71 Z"
        fill={C.sand}
        opacity={0.55}
      />
    </Svg>
  );
}

// ─── Scene definitions ────────────────────────────────────────────────────────

type Scene = {
  Hero: () => React.JSX.Element;
  particles: ParticleSpec[];
  title: string;
  subtitle: (name?: string) => string;
};

const SCENES: Record<CelebrationKind, Scene> = {
  iou_sent: {
    Hero: PlaneHero,
    particles: burstRing(["star", "dot"], [C.gold, C.rose, C.sand], 8, 70, { sizeBase: 10 }),
    title: "IOU sent",
    subtitle: (n) => (n ? `Waiting for ${n} to accept.` : "Waiting for your friend to accept."),
  },
  iou_completed: {
    Hero: HeartSealHero,
    particles: burstRing(["heart", "petal"], [C.rose, C.roseDeep, C.sand], 10, 84, { spin: 160 }),
    title: "IOU complete!",
    subtitle: () => "A promise kept. Your tree felt that.",
  },
  wish_sent: {
    Hero: SeedHero,
    particles: burstRing(["petal", "star"], [C.rose, C.leafLight, C.gold], 8, 72, { sizeBase: 12 }),
    title: "Wish planted",
    subtitle: (n) => (n ? `${n} will see it soon.` : "Your friend will see it soon."),
  },
  wish_accepted: {
    Hero: DropletHero,
    particles: burstRing(["leaf", "dot"], [C.leaf, C.leafLight, "#A9CDE8"], 8, 72, { sizeBase: 12 }),
    title: "Wish accepted",
    subtitle: (n) => (n ? `You just made ${n}'s day.` : "You just made their day."),
  },
  wish_confirmed: {
    Hero: SparkleGiftHero,
    particles: burstRing(["star", "heart"], [C.gold, C.rose, C.leafLight], 10, 86, { spin: 220 }),
    title: "Wish granted!",
    subtitle: () => "Kindness like that grows trees.",
  },
  friend_added: {
    Hero: FriendsHero,
    particles: burstRing(["confetti", "dot", "heart"], [C.rose, C.gold, C.leaf, C.sand], 12, 92, {
      spin: 320,
      sizeBase: 10,
    }),
    title: "New friend!",
    subtitle: (n) => (n ? `You and ${n} are connected.` : "Time to grow a tree together."),
  },
};

// ─── Points chip ──────────────────────────────────────────────────────────────

function PointsChip({ points }: { points: number }) {
  // NativeWind className is unreliable on Reanimated components — the Animated.View
  // only animates; all visual styling lives on the plain View inside it.
  return (
    <Animated.View entering={ZoomIn.delay(450).springify().damping(12)}>
      <View className="flex-row items-center gap-1.5 bg-brown-warm/15 dark:bg-umber/20 rounded-full px-4 py-1.5 mt-1">
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path d="M12 2 C17 8 20 12 20 16 A8 8 0 0 1 4 16 C4 12 7 8 12 2 Z" fill={C.leaf} />
        </Svg>
        <Text className="text-sm font-bold text-brown-warm dark:text-umber">
          +{points} tree point{points === 1 ? "" : "s"}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

function CelebrationCard({ celebration }: { celebration: Celebration }) {
  const scene = SCENES[celebration.kind];

  return (
    // Animated.View handles motion only; the plain View below carries the card
    // styling because NativeWind classes silently fail on Reanimated components,
    // which rendered the card transparent.
    <Animated.View
      entering={ZoomIn.springify().damping(13).stiffness(160)}
      exiting={FadeOut.duration(180)}
    >
      <View
        className="items-center bg-white dark:bg-bark-card rounded-3xl px-8 pt-8 pb-7 mx-10 border border-sand dark:border-[#3D2B3D]"
        style={styles.cardShadow}
      >
      {/* Hero + particles share one centre point */}
      <View className="items-center justify-center" style={{ width: 120, height: 110 }}>
        <View style={StyleSheet.absoluteFill} className="items-center justify-center">
          <ParticleBurst particles={scene.particles} />
        </View>
        <CenterPop delay={80}>
          <scene.Hero />
        </CenterPop>
      </View>

      <Text className="text-xl font-bold text-brown-deep dark:text-offwhite mt-3">
        {scene.title}
      </Text>
      <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center mt-1">
        {scene.subtitle(celebration.name)}
      </Text>

      {celebration.points ? <PointsChip points={celebration.points} /> : null}
      </View>
    </Animated.View>
  );
}

export function CelebrationOverlay() {
  const { current, dismiss } = useCelebrationStore();

  // Both dismiss paths (timer + tap) route through here so the rating prompt
  // can ride the tail of a completion celebration. maybeRequestReview enforces
  // all its own gates — calling it optimistically is safe.
  const handleDismiss = () => {
    const kind = useCelebrationStore.getState().current?.kind;
    dismiss();
    if (kind && REVIEW_WORTHY.includes(kind)) maybeRequestReview();
  };

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(handleDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // handleDismiss is stable in behavior (reads store at call time); omitting
    // it avoids re-arming the timer every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    // A real Modal mounts on its own native window (iOS) / Dialog (Android),
    // so it always sits above the navigator's screens and swallows all touches —
    // plain absolute-positioned Views can render *under* react-native-screens content.
    <Modal
      visible={!!current}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {current && (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(180)}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss celebration"
          />
          <View style={StyleSheet.absoluteFill} className="items-center justify-center" pointerEvents="box-none">
            {/* Key on id so back-to-back celebrations replay from scratch */}
            <CelebrationCard key={current.id} celebration={current} />
          </View>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(30, 21, 30, 0.45)",
  },
  cardShadow: {
    shadowColor: "#3D2E2E",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
});
