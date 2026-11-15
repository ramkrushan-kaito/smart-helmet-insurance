import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DemoBanner, LoadingBlock, StatusChip } from '../components/ui';
import { api, day, errorMessage, money, readToken } from '../services/api';
import { ScanResult } from '../types';
import axios from 'axios';

export function ScanPage() {
  const { token: tokenParam } = useParams();
  const navigate = useNavigate();
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState('');
  const [claimForm, setClaimForm] = useState({ incidentDate: '2026-11-01', description: '', claimAmount: '1500' });
  const started = useRef(false);

  async function lookup(value: string) {
    const token = readToken(value);
    if (!token) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await api.post<ScanResult>('/qr-codes/scan', { token });
      setResult(response.data);
    } catch (reason) {
      const message = errorMessage(reason);
      const status = axios.isAxiosError(reason) ? reason.response?.status : undefined;
      navigate('/invalid-qr', { state: { message, status } });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenParam) void lookup(tokenParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam]);

  useEffect(() => {
    if (!productId && result?.offers[0]) setProductId(result.offers[0].id);
  }, [productId, result]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const scanner = new Html5Qrcode('qr-reader');
    let stopped = false;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (stopped) return;
          stopped = true;
          scanner.stop().catch(() => undefined);
          navigate(`/scan/${encodeURIComponent(readToken(text))}`);
        },
        () => undefined,
      )
      .catch(() => {
        if (!stopped) setCameraError('Camera is unavailable. Enter the QR token manually.');
      });
    return () => {
      stopped = true;
      scanner.stop().catch(() => undefined);
    };
  }, [navigate]);

  function onManual(event: FormEvent) {
    event.preventDefault();
    navigate(`/scan/${encodeURIComponent(readToken(manual))}`);
  }

  const activePolicy = result?.policies.find((policy) => policy.status === 'ACTIVE') ?? null;

  async function submitClaim(event: FormEvent) {
    event.preventDefault();
    if (!tokenParam) return;
    setBusy(true);
    setActionError(null);
    setActionInfo(null);
    try {
      const response = await api.post<{ message: string }>('/qr-codes/scan/claim', {
        token: tokenParam,
        incidentDate: claimForm.incidentDate,
        description: claimForm.description,
        claimAmount: Number(claimForm.claimAmount),
      });
      setActionInfo(response.data.message);
      setClaimForm({ ...claimForm, description: '' });
      await lookup(tokenParam);
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function buyPolicy(event: FormEvent) {
    event.preventDefault();
    if (!tokenParam || !productId) return;
    setBusy(true);
    setActionError(null);
    setActionInfo(null);
    try {
      const response = await api.post<{ message: string }>('/qr-codes/scan/buy', { token: tokenParam, productId });
      setActionInfo(response.data.message);
      await lookup(tokenParam);
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <DemoBanner />
      <Box sx={{ maxWidth: 880, mx: 'auto', p: { xs: 2, md: 4 } }}>
        <Typography variant="h4">Scan helmet QR</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          The code contains only a scan URL. Helmet details come from PostgreSQL after the token is checked.
        </Typography>
        <Box id="qr-reader" sx={{ maxWidth: 420, borderRadius: 2, overflow: 'hidden', bgcolor: '#111' }} />
        {cameraError ? <Alert severity="info" sx={{ mt: 2 }}>{cameraError}</Alert> : null}
        <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }} onSubmit={onManual}>
          <TextField fullWidth label="QR token or scan URL" value={manual} onChange={(event) => setManual(event.target.value)} />
          <Button type="submit" variant="contained">Check token</Button>
        </Stack>
        {loading ? <LoadingBlock /> : null}
        {result ? (
          <Paper sx={{ p: 3, mt: 3 }} variant="outlined">
            <Typography variant="h5">{result.message}</Typography>
            <Stack direction="row" spacing={1} sx={{ my: 1 }}>
              <StatusChip value={result.helmet.status} />
              {result.policy ? <StatusChip value={result.policy.status} /> : null}
            </Stack>
            <Typography>Helmet {result.helmet.helmetCode} · {result.helmet.brand} {result.helmet.model}</Typography>
            <Typography>Color {result.helmet.color} · Size {result.helmet.size}</Typography>
            {result.customer ? <Typography>Customer {result.customer.fullName} · {result.customer.mobileMasked}</Typography> : null}
            {result.vehicle ? <Typography>Vehicle {result.vehicle.registrationNumber} · {result.vehicle.make} {result.vehicle.model}</Typography> : null}
            {!result.policies.length ? <Typography sx={{ mt: 1 }}>No policy is linked to this helmet.</Typography> : null}
            {result.policies.map((policy) => (
              <Box key={policy.policyNumber} sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6">Policy {policy.policyNumber}</Typography>
                <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                  <StatusChip value={policy.status} />
                </Stack>
                <Typography>{policy.productName}</Typography>
                <Typography>Cover {money(policy.coverageAmount)} · Premium {money(policy.premiumAmount)}</Typography>
                <Typography>From {day(policy.startDate)} to {day(policy.endDate)}</Typography>
                {policy.claims.length ? (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2">Claims</Typography>
                    {policy.claims.map((claim) => (
                      <Typography key={claim.claimNumber}>
                        {claim.claimNumber} · {claim.status} · {money(claim.claimAmount)} · {day(claim.incidentDate)}
                      </Typography>
                    ))}
                  </Box>
                ) : <Typography sx={{ mt: 1 }}>No claims on this policy yet.</Typography>}
              </Box>
            ))}
          </Paper>
        ) : null}
        {actionInfo ? <Alert severity="success" sx={{ mt: 2 }}>{actionInfo}</Alert> : null}
        {actionError ? <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert> : null}
        {result?.assigned && activePolicy ? (
          <Paper component="form" onSubmit={submitClaim} sx={{ p: 3, mt: 2 }} variant="outlined">
            <Typography variant="h6">File a claim</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              This claim is recorded on active policy {activePolicy.policyNumber}. Demo only. No payment is made.
            </Typography>
            <Stack spacing={2}>
              <TextField type="date" label="Incident date" InputLabelProps={{ shrink: true }} value={claimForm.incidentDate} onChange={(event) => setClaimForm({ ...claimForm, incidentDate: event.target.value })} />
              <TextField label="What happened" value={claimForm.description} onChange={(event) => setClaimForm({ ...claimForm, description: event.target.value })} helperText="At least 10 characters." multiline minRows={3} />
              <TextField label="Claim amount (INR)" type="number" value={claimForm.claimAmount} onChange={(event) => setClaimForm({ ...claimForm, claimAmount: event.target.value })} />
              <Button type="submit" variant="contained" disabled={busy || claimForm.description.trim().length < 10}>Submit claim</Button>
            </Stack>
          </Paper>
        ) : null}
        {result?.assigned && result.offers.length ? (
          <Paper component="form" onSubmit={buyPolicy} sx={{ p: 3, mt: 2 }} variant="outlined">
            <Typography variant="h6">Buy a new policy</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Demo purchase for this helmet. No money is collected.
            </Typography>
            <Stack spacing={2}>
              <TextField select label="Product" value={productId} onChange={(event) => setProductId(event.target.value)}>
                {result.offers.map((offer) => (
                  <MenuItem key={offer.id} value={offer.id}>
                    {offer.name} · {money(offer.premiumAmount)} · cover {money(offer.coverageAmount)} · {offer.durationMonths} months
                  </MenuItem>
                ))}
              </TextField>
              <Button type="submit" variant="contained" disabled={busy || !productId}>Buy policy</Button>
            </Stack>
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
}
