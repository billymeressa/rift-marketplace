import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  children: React.ReactNode;
  style?: any;
}

export default function ResponsiveContainer({ children, style }: Props) {
  const { isMobile, contentMaxWidth } = useResponsive();

  return (
    <View style={[styles.container, !isMobile && { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as any }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
