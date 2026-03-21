import { useWindowDimensions, Platform } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const isMobile  = width < 768;
  const isTablet  = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // Content widths for different contexts
  const feedMaxWidth   = 1200;   // listing feed with grid
  const formMaxWidth   = 640;    // forms, auth, create
  const detailMaxWidth = 800;    // listing detail, profile

  // Grid columns — e-commerce style (2-up on mobile like Alibaba/Amazon)
  const numColumns = isDesktop ? 4 : isTablet ? 3 : 2;

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
