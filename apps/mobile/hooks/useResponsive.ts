import { useWindowDimensions, Platform } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const isMobile  = width < 768;
  const isTablet  = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // Content widths for different contexts
  const feedMaxWidth   = 960;    // listing feed — narrower for list-style cards
  const formMaxWidth   = 640;    // forms, auth, create
  const detailMaxWidth = 800;    // listing detail, profile

  // Grid columns — B2B list style (1-up on mobile, 2 on tablet, 3 on desktop)
  const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  // Card gutter — space between columns and rows
  const cardGutter = isMobile ? 8 : 12;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isWeb,
    width,
    numColumns,
    cardGutter,
    feedMaxWidth,
    formMaxWidth,
    detailMaxWidth,
    isWide: !isMobile,
  };
}
