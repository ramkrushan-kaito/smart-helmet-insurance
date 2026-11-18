import { alpha, createTheme } from '@mui/material/styles';

const navy = '#0B1F3A';
const blue = '#2457F5';

export const brand = {
  navy,
  blue,
  gradient: 'linear-gradient(135deg, #0B1F3A 0%, #1B3A8C 55%, #2457F5 100%)',
  accentGradient: 'linear-gradient(135deg, #2457F5 0%, #00B3C7 100%)',
  amber: '#F5A524',
  border: '#E4E9F2',
  soft: '#F4F7FC',
  shadow: '0 1px 2px rgba(11,31,58,0.04), 0 8px 24px rgba(11,31,58,0.06)',
  shadowHover: '0 2px 4px rgba(11,31,58,0.06), 0 16px 40px rgba(36,87,245,0.16)',
};

export const theme = createTheme({
  palette: {
    primary: { main: blue, dark: '#1A3FC4', light: '#5B82FF', contrastText: '#FFFFFF' },
    secondary: { main: brand.amber, contrastText: '#2A1A00' },
    background: { default: '#F4F7FC', paper: '#FFFFFF' },
    text: { primary: '#0B1F3A', secondary: '#5B6B82' },
    success: { main: '#12A15F' },
    warning: { main: '#C77700' },
    error: { main: '#D92D20' },
    divider: brand.border,
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h3: { fontWeight: 800, letterSpacing: -1 },
    h4: { fontWeight: 800, letterSpacing: -0.6 },
    h5: { fontWeight: 800, letterSpacing: -0.3 },
    h6: { fontWeight: 700, letterSpacing: -0.2 },
    subtitle1: { fontWeight: 600 },
    overline: { fontWeight: 700, letterSpacing: 1.2 },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12, paddingInline: 18 },
        sizeLarge: { paddingBlock: 12, fontSize: 16 },
        containedPrimary: {
          backgroundImage: `linear-gradient(135deg, ${blue} 0%, #3B6BFF 100%)`,
          boxShadow: `0 6px 18px ${alpha(blue, 0.28)}`,
          '&:hover': { boxShadow: `0 8px 24px ${alpha(blue, 0.38)}` },
          '&.Mui-disabled': { backgroundImage: 'none' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: brand.border },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 12, backgroundColor: '#FFFFFF' },
      },
    },
  },
});
