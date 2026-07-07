import { useEffect } from "react";
import { View, useColorScheme } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export type TreeStage = "seed" | "sprout" | "healthy" | "dull" | "stump";

// Paper-cut palette — tuned to the Morning Coffee / Midnight Snuggle theme
const P = {
  leafLight: "#A8C99B",
  leaf: "#7FAF6E",
  leafDeep: "#5E8F52",
  dullLight: "#C9BC9C",
  dull: "#A89B78",
  dullDeep: "#8A7D5E",
  trunk: "#8B572A",
  trunkDeep: "#6E4420",
  soil: "#B98A5E",
  soilDeep: "#8B572A",
  seed: "#8B572A",
  sproutStem: "#7FAF6E",
  blossom: "#E8A9A9",
} as const;

// ─── Animated wrappers ────────────────────────────────────────────────────────

/** Gentle wind sway around the bottom-centre of the canvas */
function Sway({
  children,
  size,
  degrees = 2,
  duration = 2600,
  enabled = true,
}: {
  children: React.ReactNode;
  size: number;
  degrees?: number;
  duration?: number;
  enabled?: boolean;
}) {
  const sway = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    return () => {
      sway.value = 0;
    };
  }, [enabled, duration, sway]);

  const style = useAnimatedStyle(() => ({
    // Shift pivot to bottom-centre: move down, rotate, move back
    transform: [
      { translateY: size / 2 },
      { rotate: `${sway.value * degrees}deg` },
      { translateY: -size / 2 },
    ],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

/** A single leaf drifting down from the canopy, looping forever */
function FallingLeaf({
  size,
  color,
  delay = 0,
  startX = 0.62,
}: {
  size: number;
  color: string;
  delay?: number;
  startX?: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 3800, easing: Easing.in(Easing.quad) }), -1, false)
    );
    return () => {
      t.value = 0;
    };
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: size * startX,
    top: size * 0.3,
    opacity: t.value < 0.05 ? 0 : 1 - t.value * 0.85,
    transform: [
      { translateY: t.value * size * 0.5 },
      { translateX: Math.sin(t.value * Math.PI * 2) * size * 0.08 },
      { rotate: `${t.value * 260}deg` },
    ],
  }));

  const leafSize = Math.max(4, size * 0.07);
  return (
    <Animated.View style={style} pointerEvents="none">
      <Svg width={leafSize} height={leafSize} viewBox="0 0 10 10">
        <Path d="M5 0 C9 2 9 7 5 10 C1 7 1 2 5 0 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

// ─── Stage artwork (viewBox 0 0 100 100, ground line at y≈88) ────────────────

function Ground({ dull = false }: { dull?: boolean }) {
  return (
    <>
      <Ellipse cx={50} cy={90} rx={30} ry={6} fill={P.soilDeep} opacity={0.35} />
      <Ellipse cx={50} cy={88} rx={28} ry={6} fill={dull ? P.dullDeep : P.soil} opacity={0.55} />
    </>
  );
}

function SeedArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Ground />
      {/* Soil mound */}
      <Path d="M28 88 Q50 70 72 88 Z" fill={P.soilDeep} />
      <Path d="M31 88 Q50 73 69 88 Z" fill={P.soil} />
      {/* Seed peeking out */}
      <Ellipse cx={50} cy={76} rx={6.5} ry={8} fill={P.trunkDeep} />
      <Ellipse cx={48.5} cy={74.5} rx={4.5} ry={6} fill={P.seed} />
      <Path d="M50 68 Q50 62 55 60" stroke={P.sproutStem} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Circle cx={56} cy={59.4} r={2.6} fill={P.leaf} />
    </Svg>
  );
}

function SproutArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Ground />
      {/* Stem */}
      <Path d="M50 88 Q49 66 50 54" stroke={P.sproutStem} strokeWidth={4} strokeLinecap="round" fill="none" />
      {/* Leaf pair — darker offset behind each for paper-cut depth */}
      <Path d="M50 62 C36 60 30 48 32 42 C44 44 51 52 50 62 Z" fill={P.leafDeep} />
      <Path d="M50 60 C38 58 33 48 35 43 C45 45 51 52 50 60 Z" fill={P.leaf} />
      <Path d="M50 54 C64 52 70 40 68 34 C56 36 49 44 50 54 Z" fill={P.leaf} />
      <Path d="M50 52 C62 50 67 40 65 35 C55 37 49 44 50 52 Z" fill={P.leafLight} />
      {/* Bud */}
      <Circle cx={50} cy={51} r={4} fill={P.leafDeep} />
      <Circle cx={49} cy={50} r={3} fill={P.leafLight} />
    </Svg>
  );
}

function HealthyArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Ground />
      {/* Trunk */}
      <Path d="M46 88 C47 70 45 60 42 52 L48 54 C50 62 51 72 52 88 Z" fill={P.trunkDeep} />
      <Path d="M48 88 C49 70 48 60 46 52 L52 54 C53 62 53 72 54 88 Z" fill={P.trunk} />
      <Path d="M50 66 Q58 60 62 52" stroke={P.trunk} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* Canopy — three overlapping paper-cut layers */}
      <Circle cx={34} cy={42} r={17} fill={P.leafDeep} />
      <Circle cx={66} cy={44} r={15} fill={P.leafDeep} />
      <Circle cx={50} cy={30} r={19} fill={P.leafDeep} />
      <Circle cx={36} cy={40} r={14.5} fill={P.leaf} />
      <Circle cx={64} cy={42} r={12.5} fill={P.leaf} />
      <Circle cx={50} cy={29} r={16} fill={P.leaf} />
      <Circle cx={44} cy={26} r={9} fill={P.leafLight} />
      <Circle cx={60} cy={36} r={6.5} fill={P.leafLight} />
      <Circle cx={33} cy={37} r={5.5} fill={P.leafLight} />
      {/* Blossoms — ties the tree to the rose theme */}
      <Circle cx={55} cy={22} r={2.2} fill={P.blossom} />
      <Circle cx={38} cy={32} r={2} fill={P.blossom} />
      <Circle cx={65} cy={47} r={2} fill={P.blossom} />
    </Svg>
  );
}

function DullArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Ground dull />
      {/* Trunk, slightly leaning */}
      <Path d="M46 88 C47 70 44 60 40 53 L46 55 C49 63 51 72 52 88 Z" fill={P.trunkDeep} />
      <Path d="M48 88 C49 70 47 61 45 54 L51 56 C52 64 53 73 54 88 Z" fill={P.trunk} />
      {/* Bare branch poking out */}
      <Path d="M50 62 Q62 56 68 56" stroke={P.trunkDeep} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      {/* Sparse, faded canopy */}
      <Circle cx={38} cy={44} r={13} fill={P.dullDeep} />
      <Circle cx={58} cy={38} r={12} fill={P.dullDeep} />
      <Circle cx={40} cy={42} r={10.5} fill={P.dull} />
      <Circle cx={56} cy={36} r={9.5} fill={P.dull} />
      <Circle cx={48} cy={32} r={6} fill={P.dullLight} />
      {/* A couple of leaves already on the ground */}
      <Ellipse cx={68} cy={86} rx={3} ry={1.6} fill={P.dull} />
      <Ellipse cx={30} cy={87} rx={2.6} ry={1.4} fill={P.dullDeep} />
    </Svg>
  );
}

function StumpArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Ground dull />
      {/* Stump */}
      <Path d="M40 88 L40 62 Q40 58 44 58 L56 58 Q60 58 60 62 L60 88 Z" fill={P.trunkDeep} />
      <Path d="M43 88 L43 62 Q43 60 46 60 L54 60 Q57 60 57 62 L57 88 Z" fill={P.trunk} />
      <Ellipse cx={50} cy={59} rx={10} ry={4} fill={P.soil} />
      <Ellipse cx={50} cy={59} rx={6} ry={2.4} fill={P.trunkDeep} opacity={0.5} />
      {/* Hopeful new sprout beside it */}
      <Path d="M66 88 Q66 78 67 74" stroke={P.sproutStem} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M67 76 C74 74 76 68 75 65 C69 67 66 71 67 76 Z" fill={P.leaf} />
    </Svg>
  );
}

const ART: Record<TreeStage, () => React.JSX.Element> = {
  seed: SeedArt,
  sprout: SproutArt,
  healthy: HealthyArt,
  dull: DullArt,
  stump: StumpArt,
};

// ─── Public component ─────────────────────────────────────────────────────────

interface TreeFigureProps {
  stage: TreeStage;
  size?: number;
  /** Disable motion (e.g. many small instances in a long list) */
  animated?: boolean;
}

export function TreeFigure({ stage, size = 120, animated = true }: TreeFigureProps) {
  const scheme = useColorScheme();
  const Art = ART[stage];
  // Dull tree sways slowly and sheds; healthy tree sways brightly with a leaf or two
  const swayConfig =
    stage === "healthy"
      ? { degrees: 2.2, duration: 2400 }
      : stage === "dull"
      ? { degrees: 1.2, duration: 3600 }
      : stage === "sprout"
      ? { degrees: 3, duration: 2000 }
      : null;

  return (
    <View style={{ width: size, height: size, opacity: scheme === "dark" ? 0.95 : 1 }}>
      {swayConfig && animated ? (
        <Sway size={size} degrees={swayConfig.degrees} duration={swayConfig.duration}>
          <Art />
        </Sway>
      ) : (
        <Art />
      )}
      {animated && stage === "healthy" && (
        <>
          <FallingLeaf size={size} color={P.leaf} delay={600} startX={0.66} />
          <FallingLeaf size={size} color={P.leafLight} delay={2400} startX={0.34} />
        </>
      )}
      {animated && stage === "dull" && (
        <>
          <FallingLeaf size={size} color={P.dull} delay={300} startX={0.58} />
          <FallingLeaf size={size} color={P.dullDeep} delay={1900} startX={0.4} />
        </>
      )}
    </View>
  );
}
