import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from 'axios';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingBlock, PublicBar, StatusChip } from '../components/ui';
import { api, cleanName, day, errorMessage, money } from '../services/api';
import { ScanCompany, ScanResult } from '../types';

export function CoverPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<ScanCompany | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimForm, setClaimForm] = useState({ incidentDate: '2026-11-01', description: '', claimAmount: '1500' });

  async function load() {
    setLoading(true);
    try {
      const response = await api.post<ScanResult>('/qr-codes/scan', { token });
      setResult(response.data);
    } catch (reason) {
      const message = errorMessage(reason);
      const status = axios.isAxiosError(reason) ? reason.response?.status : undefined;
      navigate('/invalid-qr', { replace: true, state: { message, status } });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const active = result?.policies.find((policy) => policy.status === 'ACTIVE') ?? null;

  async function submitClaim(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const response = await api.post<{ message: string }>('/qr-codes/scan/claim', {
        token,
        incidentDate: claimForm.incidentDate,
        description: claimForm.description,
        claimAmount: Number(claimForm.claimAmount),
      });
      setInfo(response.data.message);
      setClaimForm({ ...claimForm, description: '' });
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function buy(event: FormEvent) {
    event.preventDefault();
    if (!company) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const response = await api.post<{ message: string }>('/qr-codes/scan/buy', { token, companyCode: company.code });
      setInfo(response.data.message);
      setCompany(null);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PublicBar />
      <Box sx={{ maxWidth: 1120, mx: 'auto', p: { xs: 2, md: 4 } }}>
        {loading && !result ? <LoadingBlock /> : null}
        {result ? (
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="secondary.main">Helmet verified</Typography>
              <Typography variant="h4">{result.helmet.helmetCode}</Typography>
              <Typography color="text.secondary">
                {result.helmet.brand} {result.helmet.model} · {result.helmet.color} · Size {result.helmet.size}
              </Typography>
            </Box>
            {info ? <Alert severity="success">{info}</Alert> : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Paper sx={{ p: 3 }} variant="outlined">
                <Typography variant="h6">Helmet</Typography>
                <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                  <StatusChip value={result.helmet.status} />
                </Stack>
                {result.customer ? <Typography>{cleanName(result.customer.fullName)} · {result.customer.mobileMasked}</Typography> : <Typography>Not assigned to a rider yet.</Typography>}
                {result.vehicle ? <Typography>{result.vehicle.registrationNumber} · {result.vehicle.make} {result.vehicle.model}</Typography> : null}
              </Paper>
              <Paper sx={{ p: 3 }} variant="outlined">
                <Typography variant="h6">Active cover</Typography>
                {active ? (
                  <>
                    <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                      <StatusChip value={active.status} />
                    </Stack>
                    <Typography variant="h5">{active.policyNumber}</Typography>
                    <Typography>{cleanName(active.productName)}</Typography>
                    <Typography>Cover {money(active.coverageAmount)} · Premium {money(active.premiumAmount)}</Typography>
                    <Typography>{day(active.startDate)} to {day(active.endDate)}</Typography>
                  </>
                ) : <Typography sx={{ mt: 1 }}>No active policy. Choose an insurer below.</Typography>}
              </Paper>
            </Box>
            {result.policies.length ? (
              <Stack spacing={1.5}>
                <Typography variant="h6">Policies</Typography>
                {result.policies.map((policy) => (
                  <Paper key={policy.policyNumber} sx={{ p: 2.5 }} variant="outlined">
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography variant="h6">{policy.policyNumber}</Typography>
                        <Typography color="text.secondary">{cleanName(policy.productName)}</Typography>
                      </Box>
                      <StatusChip value={policy.status} />
                    </Stack>
                    <Typography sx={{ mt: 1 }}>Cover {money(policy.coverageAmount)} · Premium {money(policy.premiumAmount)} · until {day(policy.endDate)}</Typography>
                    <Typography sx={{ mt: 1 }} variant="subtitle2">Claims</Typography>
                    {policy.claims.length ? policy.claims.map((claim) => (
                      <Typography key={claim.claimNumber}>{claim.claimNumber} · {claim.status.replace(/_/g, ' ')} · {money(claim.claimAmount)} · {day(claim.incidentDate)}</Typography>
                    )) : <Typography color="text.secondary">No claims yet.</Typography>}
                  </Paper>
                ))}
              </Stack>
            ) : null}
            {active ? (
              <Paper component="form" onSubmit={submitClaim} sx={{ p: 3 }} variant="outlined">
                <Typography variant="h6">File a claim</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>On {active.policyNumber}. Cover up to {money(active.coverageAmount)}.</Typography>
                <Stack spacing={2}>
                  <TextField type="date" label="Incident date" InputLabelProps={{ shrink: true }} value={claimForm.incidentDate} onChange={(event) => setClaimForm({ ...claimForm, incidentDate: event.target.value })} />
                  <TextField label="What happened" value={claimForm.description} onChange={(event) => setClaimForm({ ...claimForm, description: event.target.value })} helperText="At least 10 characters." multiline minRows={3} />
                  <TextField label="Amount (INR)" type="number" value={claimForm.claimAmount} onChange={(event) => setClaimForm({ ...claimForm, claimAmount: event.target.value })} />
                  <Button type="submit" variant="contained" disabled={busy || claimForm.description.trim().length < 10} sx={{ alignSelf: 'flex-start' }}>Submit claim</Button>
                </Stack>
              </Paper>
            ) : null}
            {result.companies.length ? (
              <Box component="form" onSubmit={buy}>
                <Typography variant="h6">Buy a new policy</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>Pick one insurer. The new cover starts today.</Typography>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
                  {result.companies.map((item) => {
                    const selected = company?.code === item.code;
                    return (
                      <Paper
                        key={item.code}
                        onClick={() => setCompany(item)}
                        variant="outlined"
                        sx={{
                          p: 2.5,
                          cursor: 'pointer',
                          borderColor: selected ? 'primary.main' : 'divider',
                          borderWidth: selected ? 2 : 1,
                          boxShadow: selected ? '0 8px 24px rgba(14,58,93,0.12)' : 'none',
                        }}
                      >
                        <Typography variant="overline" color="text.secondary">{item.code}</Typography>
                        <Typography variant="h6">{item.name}</Typography>
                        <Typography color="text.secondary" sx={{ minHeight: 44 }}>{item.line}</Typography>
                        <Typography variant="h5" sx={{ mt: 1 }}>{money(item.premium)}</Typography>
                        <Typography>Cover {money(item.coverage)}</Typography>
                        <Typography color="text.secondary">{item.months} months</Typography>
                      </Paper>
                    );
                  })}
                </Box>
                <Button type="submit" variant="contained" size="large" disabled={busy || !company} sx={{ mt: 2 }}>
                  {company ? `Buy ${company.name}` : 'Select an insurer'}
                </Button>
              </Box>
            ) : null}
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
