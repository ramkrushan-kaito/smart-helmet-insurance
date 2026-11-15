import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DemoBanner, LoadingBlock, StatusChip } from '../components/ui';
import { api, errorMessage, readToken } from '../services/api';
import { ScanResult } from '../types';
import axios from 'axios';

export function ScanPage() {
  const { token: tokenParam } = useParams();
  const navigate = useNavigate();
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
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
            {result.policy ? <Typography>Policy {result.policy.policyNumber} · {result.policy.productName} · ends {new Date(result.policy.endDate).toLocaleDateString('en-IN')}</Typography> : <Typography>No policy is linked to this helmet.</Typography>}
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
}
