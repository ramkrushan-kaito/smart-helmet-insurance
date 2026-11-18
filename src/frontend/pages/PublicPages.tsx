import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { PublicBar } from '../components/ui';

export function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PublicBar />
      <Container sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
          <Typography variant="overline" color="secondary.main">Helmet cover</Typography>
          <Typography variant="h3" sx={{ fontWeight: 750, letterSpacing: -1 }}>
            Kaito Nexus
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            Scan a helmet QR to see the policy, file a claim, or buy cover from an insurer.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to="/scan" variant="contained" size="large">Scan a QR code</Button>
            <Button component={RouterLink} to="/login" variant="outlined" size="large">Customer sign in</Button>
            <Button component={RouterLink} to="/admin/login" variant="outlined" size="large">Admin</Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

export function AccessDeniedPage() {
  return (
    <Container sx={{ py: 8 }}>
      <Typography variant="h4">Access denied</Typography>
      <Button component={RouterLink} to="/" sx={{ mt: 2 }}>Back home</Button>
    </Container>
  );
}

export function NotFoundPage() {
  return (
    <Container sx={{ py: 8 }}>
      <Typography variant="h4">Page not found</Typography>
      <Button component={RouterLink} to="/" sx={{ mt: 2 }}>Back home</Button>
    </Container>
  );
}

export function InvalidQrPage() {
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PublicBar />
      <Container sx={{ py: { xs: 6, md: 10 }, maxWidth: 520, textAlign: 'center' }}>
        <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: '20px', boxShadow: '0 1px 2px rgba(11,31,58,0.04), 0 8px 24px rgba(11,31,58,0.06)' }}>
          <Box sx={{ width: 72, height: 72, mx: 'auto', mb: 2, borderRadius: '50%', bgcolor: '#FEE4E2', color: 'error.main', display: 'grid', placeItems: 'center', fontSize: 36, fontWeight: 800 }}>!</Box>
          <Typography variant="h5">This QR cannot be used</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>{message || 'This helmet is not registered.'}</Typography>
          <Button component={RouterLink} to="/scan" variant="contained" size="large" fullWidth sx={{ mt: 3 }}>Scan again</Button>
        </Paper>
      </Container>
    </Box>
  );
}
