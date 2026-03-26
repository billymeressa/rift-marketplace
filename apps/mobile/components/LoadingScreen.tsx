import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { isTelegramMiniApp } from '../lib/telegram-webapp';
import { getTMATheme } from '../lib/telegram-theme';

const isTMA = Platform.OS === 'web' && typeof window !== 'undefined' && isTelegramMiniApp();
const theme = isTMA ? getTMATheme() : null;

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const HEALTH_URL = API_URL.replace(/\/api\/v1$/, '') + '/health';

const CACHE_KEY = 'xz_server_awake';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function isRecentlyCached(): boolean {
  try {
    const ts = sessionStorage.getItem(CACHE_KEY);
    return !!ts && Date.now() - Number(ts) < CACHE_TTL;
  } catch {
    return false;
  }
}

function markServerAwake() {
  try { sessionStorage.setItem(CACHE_KEY, String(Date.now())); } catch {}
}

// Quick probe: try the health endpoint with a short timeout.
// Returns true if the server is already awake, false if it's cold/sleeping.
async function quickProbe(): Promise<boolean> {
  // If server was recently confirmed awake in this session, skip the network check
  if (isRecentlyCached()) return true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 s max
    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      markServerAwake();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

const MESSAGES = [
  'Starting up…',
  'Waking up the server…',
  'Almost there…',
  'Connecting to services…',
  'Just a moment…',
];

export default function LoadingScreen({ onReady }: { onReady?: () => void }) {
  // Three states:
  //   'probing'  — quick 2 s check running (render nothing yet)
  //   'awake'    — server responded fast, skip straight to app
  //   'sleeping' — server is cold, show the loading UI
  const [state, setState] = useState<'probing' | 'awake' | 'sleeping'>('probing');
  const skip = state === 'awake';

  const [messageIndex, setMessageIndex] = useState(0);
  const [serverReady, setServerReady] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Quick probe: if the server is already awake, go straight to the app.
  // Otherwise, flip to 'sleeping' and show the loading UI.
  useEffect(() => {
    let cancelled = false;
    quickProbe().then((awake) => {
      if (cancelled) return;
      if (awake) {
        setState('awake');
        onReady?.();
      } else {
        setState('sleeping');
      }
    });
    return () => { cancelled = true; };
  }, []);

  // All animation/timer effects depend on state so they fire when probe resolves to 'sleeping'

  // Fade in
  useEffect(() => {
    if (state !== 'sleeping') return;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [state]);

  // Pulse the logo
  useEffect(() => {
    if (state !== 'sleeping') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [state]);

  // Animate dots
  useEffect(() => {
    if (state !== 'sleeping') return;
    const dots = Animated.loop(
      Animated.timing(dotAnim, { toValue: 3, duration: 1500, useNativeDriver: false })
    );
    dots.start();
    return () => dots.stop();
  }, [state]);

  // Cycle through messages
  useEffect(() => {
    if (state !== 'sleeping') return;
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [state]);

  // Animate progress bar
  useEffect(() => {
    if (state !== 'sleeping') return;
    Animated.timing(progressAnim, {
      toValue: 0.9,
      duration: 15000,
      useNativeDriver: false,
    }).start();
  }, [state]);

  // Complete progress when server responds, then auto-advance
  useEffect(() => {
    if (!serverReady) return;
    progressAnim.stopAnimation();
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start(() => onReady?.());
  }, [serverReady]);

  // Show skip button after 45 seconds
  useEffect(() => {
    if (state !== 'sleeping') return;
    const t = setTimeout(() => setShowSkip(true), 45000);
    return () => clearTimeout(t);
  }, [state]);

  // Retry ping while sleeping
  useEffect(() => {
    if (state !== 'sleeping') return;
    let cancelled = false;
    let attempt = 0;

    const ping = async () => {
      while (!cancelled) {
        attempt++;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(HEALTH_URL, { signal: controller.signal });
          clearTimeout(timeout);
          if (res.ok && !cancelled) {
            markServerAwake();
            setServerReady(true);
            return;
          }
        } catch {
          // Server still waking up
        }
        // Retry with backoff: 2s, 2s, 3s, 3s, 4s...
        const delay = Math.min(2000 + Math.floor(attempt / 2) * 1000, 5000);
        await new Promise((r) => setTimeout(r, delay));
      }
    };

    ping();
    return () => { cancelled = true; };
  }, [state]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // While probing, render nothing — avoids any flash of the loading screen
  if (state !== 'sleeping') return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, isTMA && { backgroundColor: theme?.bg }]}>
      <View style={styles.content}>
        {/* Logo / Brand */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🌾</Text>
          </View>
        </Animated.View>

        <Text style={[styles.title, isTMA && { color: theme?.text }]}>Nile Xport</Text>
        <Text style={[styles.subtitle, isTMA && { color: theme?.hint }]}>Ethiopia's Agricultural Export Marketplace</Text>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, isTMA && { backgroundColor: theme?.separator }]}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }, isTMA && { backgroundColor: theme?.accent }]} />
          </View>
        </View>

        {/* Status message */}
        <Text style={[styles.message, isTMA && { color: theme?.subtitle }]}>{MESSAGES[messageIndex]}</Text>

        {/* Tip */}
        <View style={[styles.tipContainer, isTMA && { backgroundColor: theme?.secondaryBg }]}>
          <Text style={[styles.tip, isTMA && { color: theme?.hint }]}>
            First load may take up to 30 seconds{'\n'}while our server wakes up
          </Text>
        </View>

        {/* Skip button — appears after 45s as a safety valve */}
        {showSkip && (
          <TouchableOpacity style={styles.skipBtn} onPress={() => onReady?.()} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip and continue →</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 400,
    width: '100%',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#F0F7F0',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 24px rgba(47, 149, 220, 0.12)',
      },
      default: {
        shadowColor: '#2f95dc',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
      },
    }),
  },
  logoEmoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 40,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#EBEBEB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E7D32',
    borderRadius: 2,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 48,
  },
  tipContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  tip: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  skipBtn: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 13,
    color: '#aaa',
    textDecorationLine: 'underline',
  },
});
