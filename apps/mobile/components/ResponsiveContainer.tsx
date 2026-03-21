import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  children: React.ReactNode;
  style?: any;
  /** Which max-width preset: 'feed' (1200), 'form' (640), 'detail' (800) */
  size?: 'feed' | 'form' | 'detail';
}

export default function ResponsiveContainer({ children, style, size = 'detail' }: Props) {
  const { isMobile, feedMaxWidth, formMaxWidth, detailMaxWidth } = useResponsive();

  const maxWidth = size === 'feed' ? feedMaxWidth : size === 'form' ? formMaxWidth : detailMaxWidth;

  return (
    <View style={[
      styles.container,
      !isMobile && { maxWidth, alignSelf: 'center' as const, width: '100%' as any },
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
