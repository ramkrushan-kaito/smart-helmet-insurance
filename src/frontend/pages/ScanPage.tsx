import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PublicBar } from '../components/ui';
import { readToken } from '../services/api';

export function ScanRedirect() {
  const { token = '' } = useParams();
  return <Navigate to={`/cover/${token}`} replace />;
}

export function ScanPage() {
  const navigate = useNavigate();
  const [manual, setManual] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const started = useRef(false);

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
          navigate(`/cover/${encodeURIComponent(readToken(text))}`, { replace: true });
        },
        () => undefined,
      )
      .catch(() => {
        if (!stopped) setCameraError('Camera is unavailable. Enter the code below.');
      });
    return () => {
      stopped = true;
      scanner.stop().catch(() => undefined);
    };
  }, [navigate]);

  function onManual(event: FormEvent) {
    event.preventDefault();
    const token = readToken(manual);
    if (!token) return;
    navigate(`/cover/${encodeURIComponent(token)}`, { replace: true });
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PublicBar />
      <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 2, md: 4 } }}>
        <Typography variant="h4">Scan helmet QR</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Point the camera at the sticker. A valid code opens the cover screen.
        </Typography>
        <Box id="qr-reader" sx={{ maxWidth: 420, borderRadius: 2, overflow: 'hidden', bgcolor: '#111' }} />
        {cameraError ? <Alert severity="info" sx={{ mt: 2 }}>{cameraError}</Alert> : null}
        <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }} onSubmit={onManual}>
          <TextField fullWidth label="Code or scan link" value={manual} onChange={(event) => setManual(event.target.value)} />
          <Button type="submit" variant="contained">Open cover</Button>
        </Stack>
      </Box>
    </Box>
  );
}
