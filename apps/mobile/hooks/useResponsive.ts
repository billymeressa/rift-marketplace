import { useWindowDimensions, Platform } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // Content widths for different contexts
  const feedMaxWidth = 1200;     // listing feed with grid
  const formMaxWidth = 640;      // forms, auth, create
  const detailMaxWidth = 800;    // listing detail, profile

  // Grid columns for listing cards
  const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isWeb,
    width,
    numColumns,
    feedMaxWidth,
    formMaxWidth,
    detailMaxWidth,
    // Shorthand: is this a wide screen (tablet or desktop)?
    isWide: !isMobile,
  };
}
