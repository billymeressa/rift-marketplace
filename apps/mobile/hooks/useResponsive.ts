import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();

  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    contentMaxWidth: 800,
    numColumns: width >= 1024 ? 3 : width >= 768 ? 2 : 1,
    width,
  };
}
