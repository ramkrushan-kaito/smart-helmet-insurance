import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { DemoBanner } from '../components/ui';

const samples = [
  ['Valid assigned helmet', 'active-demo-token-hm10001'],
  ['Inactive QR', 'inactive-demo-token-hm10008'],
  ['Revoked QR', 'revoked-demo-token-hm10009'],
  ['Unassigned helmet', 'unassigned-demo-token-hm10013'],
];

export function LandingPage() {
  return (
    <Box>
      <DemoBanner />
      <Container sx={{ py: { xs: 4, md: 8 } }}>
        <Stack spacing={3} sx={{ maxWidth: 820 }}>
          <Typography variant="overline" color="secondary.main">
            Local demo · PostgreSQL
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 750, letterSpacing: -1 }}>
            Smart Helmet QR Insurance
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            Register a helmet, print a QR sticker, and look the helmet up without putting customer or policy data inside the code.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to="/scan" variant="contained" size="large">
              Scan a QR code
            </Button>
            <Button component={RouterLink} to="/login" variant="outlined" size="large">
              Customer OTP login
            </Button>
            <Button component={RouterLink} to="/admin/login" variant="outlined" size="large">
              Admin login
            </Button>
          </Stack>
        </Stack>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mt: 5 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Typography variant="h6">Demo credentials</Typography>
            <Typography sx={{ mt: 1 }}>Super admin: superadmin@demo.helmet.test</Typography>
            <Typography>Admin: admin@demo.helmet.test</Typography>
            <Typography>Password: Admin@12345</Typography>
            <Typography sx={{ mt: 1 }}>Customer mobiles: 9000000001 to 9000000010</Typography>
            <Typography>OTP: 123456. No SMS is sent.</Typography>
          </Paper>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Typography variant="h6">Try a sample QR token</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {samples.map(([label, token]) => (
                <Button key={token} component={RouterLink} to={`/scan/${token}`} variant="text" sx={{ justifyContent: 'flex-start' }}>
                  {label}
                </Button>
              ))}
            </Stack>
          </Paper>
        </Box>
        <Typography sx={{ mt: 4 }} color="text.secondary">
          This is not an insurer. Every record is marked DEMO DATA and lives in your local PostgreSQL database.
        </Typography>
      </Container>
    </Box>
  );
}

export function AccessDeniedPage() {
  return (
    <Container sx={{ py: 8 }}>
      <Typography variant="h4">Access denied</Typography>
      <Typography sx={{ mt: 1 }}>Your role cannot open this page.</Typography>
      <Button component={RouterLink} to="/" sx={{ mt: 2 }}>
        Back home
      </Button>
    </Container>
  );
}

export function NotFoundPage() {
  return (
    <Container sx={{ py: 8 }}>
      <Typography variant="h4">Page not found</Typography>
      <Button component={RouterLink} to="/" sx={{ mt: 2 }}>
        Back home
      </Button>
    </Container>
  );
}

export function InvalidQrPage() {
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;
  return (
    <Container sx={{ py: 8, maxWidth: 720 }}>
      <DemoBanner />
      <Typography variant="h4" sx={{ mt: 3 }}>
        QR check failed
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }} variant="outlined">
        <Typography>{message || 'Invalid QR Code. This helmet is not registered in our system.'}</Typography>
      </Paper>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button component={RouterLink} to="/scan" variant="contained">
          Try another code
        </Button>
        <Button component={RouterLink} to="/">
          Home
        </Button>
      </Stack>
    </Container>
  );
}
