import * as Font from 'expo-font';

// Font names to use in your app
export const Fonts = {
  Regular: 'Montserrat-Regular',
  SemiBold: 'Montserrat-SemiBold',
  Bold: 'Montserrat-Bold',
  Italic: 'Montserrat-Italic',
  SemiBoldItalic: 'Montserrat-SemiBoldItalic',
  BoldItalic: 'Montserrat-BoldItalic',
  Medium: 'Montserrat-Medium',
};

// Load fonts function
export const loadFonts = async () => {
  await Font.loadAsync({
    [Fonts.Regular]: require('../assets/fonts/Montserrat-Regular.ttf'),
    [Fonts.SemiBold]: require('../assets/fonts/Montserrat-SemiBold.ttf'),
    [Fonts.Bold]: require('../assets/fonts/Montserrat-Bold.ttf'),
    [Fonts.Italic]: require('../assets/fonts/Montserrat-Italic.ttf'),
    [Fonts.SemiBoldItalic]: require('../assets/fonts/Montserrat-SemiBoldItalic.ttf'),
    [Fonts.BoldItalic]: require('../assets/fonts/Montserrat-BoldItalic.ttf'),
    [Fonts.Medium]: require('../assets/fonts/Montserrat-Medium.ttf'),
  });
};