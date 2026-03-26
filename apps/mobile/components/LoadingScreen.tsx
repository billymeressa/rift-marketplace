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

// Cache key + TTL: if server was healthy within the last 10 minutes, skip the check.
const CACHE_KEY = 'serverHealthyAt';
const CACHE_TTL_MS = 10 * 60 * 1000;

function isServerCachedHealthy(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  const ts = sessionStorage.getItem(CACHE_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < CACHE_TTL_MS;
}

function markServerHealthy() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(CACHE_KEY, String(Date.now()));
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
  // If the server was confirmed healthy recently, skip the loading screen immediately.
  const [skip] = useState(() => isServerCachedHealthy());

  const [messageIndex, setMessageIndex] = useState(0);
  const [serverReady, setServerReady] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Skip immediately if server was recently healthy
  useEffect(() => {
    if (skip) onReady?.();
  }, []);

  // Fade in on mount
  useEffect(() => {
    if (skip) return;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Pulse the logo
  useEffect(() => {
    if (skip) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Animate dots
  useEffect(() => {
    if (skip) return;
    const dots = Animated.loop(
      Animated.timing(dotAnim, {
        toValue: 3,
        duration: 1500,
        useNativeDriver: false,
      })
    );
    dots.start();
    return () => dots.stop();
  }, []);

  // Cycle through messages
  useEffect(() => {
    if (skip) return;
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Animate progress bar
  useEffect(() => {
    if (skip) return;
    // Simulate progress that slows down as it approaches 90%
    Animated.timing(progressAnim, {
      toValue: 0.9,
      duration: 15000,
      useNativeDriver: false,
    }).start();
  }, []);

  // Complete progress when server is ready
  useEffect(() => {
    if (serverReady) {
      progressAnim.stopAnimation((value) => {
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }).start(() => {
          onReady?.();
        });
      });
    }
  }, [serverReady]);

  // Show skip button after 45 seconds
  useEffect(() => {
    if (skip) return;
    const t = setTimeout(() => setShowSkip(true), 45000);
    return () => clearTimeout(t);
  }, []);

  // Ping server health endpoint
  useEffect(() => {
    if (skip) return;
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
            markServerHealthy();
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
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (skip) return null;

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
