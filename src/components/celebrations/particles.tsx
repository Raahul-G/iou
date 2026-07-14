import { useEffect } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ─── Paper-cut shape library ──────────────────────────────────────────────────

export type ParticleShape = "heart" | "star" | "petal" | "leaf" | "confetti" | "dot";

function ShapeSvg({ shape, color, size }: { shape: ParticleShape; color: string; size: number }) {
  switch (shape) {
    case "heart":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 21 C5 15 2 11 2 7.5 C2 4.4 4.4 2 7.5 2 C9.2 2 10.9 2.9 12 4.3 C13.1 2.9 14.8 2 16.5 2 C19.6 2 22 4.4 22 7.5 C22 11 19 15 12 21 Z"
            fill={color}
          />
        </Svg>
      );
    case "star":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" fill={color} />
        </Svg>
      );
    case "petal":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 2 C19 6 19 16 12 22 C5 16 5 6 12 2 Z" fill={color} />
        </Svg>
      );
    case "leaf":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M20 4 C10 4 4 10 4 20 C14 20 20 14 20 4 Z M6 18 C10 12 14 8 18 6" fill={color} />
        </Svg>
      );
    case "confetti":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={4} y={9} width={16} height={6} rx={2} fill={color} />
        </Svg>
      );
    case "dot":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={8} fill={color} />
        </Svg>
      );
  }
}

// ─── Particle burst ───────────────────────────────────────────────────────────

export type ParticleSpec = {
  shape: ParticleShape;
  color: string;
  /** Final offset from the burst centre, in px */
  dx: number;
  dy: number;
  size?: number;
  delay?: number;
  /** Total degrees of spin over the flight */
  spin?: number;
};

function Particle({ spec, duration }: { spec: ParticleSpec; duration: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      spec.delay ?? 0,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, [t, spec.delay, duration]);

  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    opacity: interpolate(t.value, [0, 0.12, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: t.value * spec.dx },
      { translateY: t.value * spec.dy },
      { rotate: `${t.value * (spec.spin ?? 0)}deg` },
      { scale: interpolate(t.value, [0, 0.25, 1], [0.3, 1, 0.85]) },
    ],
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <ShapeSvg shape={spec.shape} color={spec.color} size={spec.size ?? 16} />
    </Animated.View>
  );
}

/** Renders all particles bursting from the centre of its (positioned) parent */
export function ParticleBurst({
  particles,
  duration = 1600,
}: {
  particles: ParticleSpec[];
  duration?: number;
}) {
  return (
    <>
      {particles.map((p, i) => (
        <Particle key={i} spec={p} duration={duration} />
      ))}
    </>
  );
}

/** Deterministic ring of particles — angles evenly spread, radii/sizes varied by index */
export function burstRing(
  shapes: ParticleShape[],
  colors: string[],
  count: number,
  radius: number,
  opts?: { upwardBias?: number; spin?: number; sizeBase?: number }
): ParticleSpec[] {
  const { upwardBias = 0.35, spin = 200, sizeBase = 14 } = opts ?? {};
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const r = radius * (0.8 + 0.35 * ((i * 7) % 3) * 0.5);
    return {
      shape: shapes[i % shapes.length],
      color: colors[i % colors.length],
      dx: Math.cos(angle) * r,
      dy: Math.sin(angle) * r - radius * upwardBias,
      size: sizeBase + ((i * 5) % 3) * 3,
      delay: (i % 4) * 70,
      spin: spin * (i % 2 === 0 ? 1 : -1),
    };
  });
}

// ─── Centre hero pop ──────────────────────────────────────────────────────────

/** Springs the hero artwork in with an overshoot, like a sticker being slapped on */
export function CenterPop({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 180 }));
  }, [scale, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
