import { Box, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { LoadingBlock, PageHeader } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { money } from '../services/api';

type AdminDash = {
  customers: number;
  helmets: number;
  vehicles: number;
  unassignedHelmets: number;
  policiesByStatus: Record<string, number>;
  claimsByStatus: Record<string, number>;
  qrByStatus: Record<string, number>;
  successfulPayments: number;
  successfulPaymentAmount: string | number;
  recentClaims: { id: string; claimNumber: string; status: string; customer?: { fullName: string } }[];
};

export function AdminDashboardPage() {
  const { data, loading, error } = useFetch<AdminDash>('/dashboard/admin');
  if (loading) return <LoadingBlock />;
  if (error || !data) return <Typography color="error">{error}</Typography>;
  const cards = [
    ['Customers', data.customers, '/admin/customers'],
    ['Helmets', data.helmets, '/admin/helmets'],
    ['Unassigned', data.unassignedHelmets, '/admin/helmets?status=UNASSIGNED'],
    ['Vehicles', data.vehicles, '/admin/vehicles'],
    ['Active QR', data.qrByStatus.ACTIVE ?? 0, '/admin/qr'],
    ['Open claims', (data.claimsByStatus.SUBMITTED ?? 0) + (data.claimsByStatus.UNDER_REVIEW ?? 0), '/admin/claims'],
    ['Demo payments', data.successfulPayments, '/admin/payments'],
    ['Recorded amount', money(data.successfulPaymentAmount), '/admin/payments'],
  ];
  return (
    <Box>
      <PageHeader title="Dashboard" />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
        {cards.map(([label, value, to]) => (
          <Paper key={String(label)} component={RouterLink} to={String(to)} sx={{ p: 2, textDecoration: 'none', color: 'inherit' }} variant="outlined">
            <Typography color="text.secondary">{label}</Typography>
            <Typography variant="h5">{value}</Typography>
          </Paper>
        ))}
      </Box>
      <Typography variant="h6" sx={{ mt: 3 }}>Recent claims</Typography>
      <StackList rows={data.recentClaims.map((claim) => `${claim.claimNumber} · ${claim.status} · ${claim.customer?.fullName ?? ''}`)} />
    </Box>
  );
}

function StackList({ rows }: { rows: string[] }) {
  return (
    <Paper variant="outlined" sx={{ mt: 1 }}>
      {rows.length === 0 ? <Typography sx={{ p: 2 }}>No claims yet.</Typography> : rows.map((row) => <Typography key={row} sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>{row}</Typography>)}
    </Paper>
  );
}

type CustomerDash = {
  helmets: number;
  vehicles: number;
  policies: number;
  openClaims: number;
  unreadNotifications: number;
};

export function CustomerDashboardPage() {
  const { data, loading, error } = useFetch<CustomerDash>('/dashboard/customer');
  if (loading) return <LoadingBlock />;
  if (error || !data) return <Typography color="error">{error}</Typography>;
  const cards = [
    ['Helmets', data.helmets, '/app/helmets'],
    ['Vehicles', data.vehicles, '/app/vehicles'],
    ['Policies', data.policies, '/app/policies'],
    ['Open claims', data.openClaims, '/app/claims'],
    ['Unread', data.unreadNotifications, '/app/notifications'],
  ];
  return (
    <Box>
      <PageHeader title="Your cover" />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' } }}>
        {cards.map(([label, value, to]) => (
          <Paper key={String(label)} component={RouterLink} to={String(to)} sx={{ p: 2, textDecoration: 'none', color: 'inherit' }} variant="outlined">
            <Typography color="text.secondary">{label}</Typography>
            <Typography variant="h5">{value}</Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
