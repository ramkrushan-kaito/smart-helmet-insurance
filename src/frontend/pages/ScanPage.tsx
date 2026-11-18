import BoltIcon from '@mui/icons-material/Bolt';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { Alert, Box, Button, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PublicBar } from '../components/ui';
import { readToken } from '../services/api';
import { brand } from '../theme';

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
    let stopping: Promise<void> | null = null;

    // html5-qrcode's stop() throws synchronously when the scanner is not running,
    // which crashed the page during unmount and blocked the redirect until a refresh.
    const stopScanner = () => {
      if (stopping) return stopping;
      try {
        const state = scanner.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          stopping = scanner.stop().catch(() => undefined);
          return stopping;
        }
      } catch {
        /* scanner already stopped */
      }
      stopping = Promise.resolve();
      return stopping;
    };

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, aspectRatio: 1 },
        (text) => {
          if (stopped) return;
          stopped = true;
          const token = readToken(text);
          void stopScanner();
          navigate(`/cover/${encodeURIComponent(token)}`, { replace: true });
        },
        () => undefined,
      )
      .then(() => {
        // Component unmounted while the camera was still starting.
        if (stopped) void stopScanner();
      })
      .catch(() => {
        if (!stopped) setCameraError('Camera is unavailable. Enter the code below.');
      });
    return () => {
      stopped = true;
      void stopScanner();
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
      <Box sx={{ background: brand.gradient, color: '#fff', pt: { xs: 4, md: 6 }, pb: { xs: 14, md: 16 }, px: 2, textAlign: 'center' }}>
        <Typography variant="overline" sx={{ opacity: 0.8 }}>Smart helmet insurance</Typography>
        <Typography variant="h4" sx={{ fontSize: { xs: 28, md: 36 }, mt: 0.5 }}>Scan your helmet QR</Typography>
        <Typography sx={{ opacity: 0.8, mt: 1, maxWidth: 420, mx: 'auto' }}>
          Point the camera at the sticker on your helmet to see plans and get covered in minutes.
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 460, mx: 'auto', px: 2, mt: { xs: -11, md: -12 }, pb: 6 }}>
        <Paper sx={{ p: 1.5, borderRadius: '20px', boxShadow: '0 24px 60px rgba(11,31,58,0.22)' }}>
          <Box sx={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', bgcolor: '#0B1F3A', aspectRatio: '1 / 1' }}>
            <Box id="qr-reader" sx={{ position: 'absolute', inset: 0 }} />
            <ScanFrame />
            {cameraError ? (
              <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ position: 'absolute', inset: 0, color: '#fff', p: 3, textAlign: 'center' }}>
                <KeyboardIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                <Typography fontWeight={700}>Camera not available</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>Enter the code printed under the QR instead.</Typography>
              </Stack>
            ) : null}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 1.5, color: 'text.secondary' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cameraError ? 'warning.main' : 'success.main' }} />
            <Typography variant="body2" fontWeight={600}>{cameraError ? 'Use manual entry below' : 'Looking for a QR code…'}</Typography>
          </Stack>
        </Paper>

        <Paper component="form" onSubmit={onManual} variant="outlined" sx={{ p: 2.5, mt: 2.5, borderRadius: '20px' }}>
          <Typography fontWeight={700} sx={{ mb: 1.5 }}>Or enter the code</Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. HM-10012 or scan link"
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><KeyboardIcon fontSize="small" /></InputAdornment> }}
            />
            <Button type="submit" variant="contained" disabled={!manual.trim()}>Go</Button>
          </Stack>
        </Paper>
        {cameraError ? <Alert severity="info" sx={{ mt: 2, borderRadius: '14px' }}>{cameraError}</Alert> : null}

        <Stack direction="row" justifyContent="space-around" sx={{ mt: 3, color: 'text.secondary' }}>
          <Trust icon={<BoltIcon fontSize="small" />} label="Cover in 2 min" />
          <Trust icon={<VerifiedUserIcon fontSize="small" />} label="Trusted insurers" />
          <Trust icon={<LockIcon fontSize="small" />} label="Secure payment" />
        </Stack>
      </Box>
    </Box>
  );
}

function Trust({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Stack alignItems="center" spacing={0.5}>
      <Box sx={{ color: 'primary.main', bgcolor: '#E8EEFF', borderRadius: '50%', width: 36, height: 36, display: 'grid', placeItems: 'center' }}>{icon}</Box>
      <Typography variant="caption" fontWeight={600}>{label}</Typography>
    </Stack>
  );
}

function ScanFrame() {
  const corner = { position: 'absolute', width: 36, height: 36, borderColor: '#fff', borderStyle: 'solid', borderWidth: 0 } as const;
  return (
    <Box sx={{ position: 'absolute', inset: '14%', pointerEvents: 'none' }}>
      <Box sx={{ ...corner, top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 }} />
      <Box sx={{ ...corner, top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 }} />
      <Box sx={{ ...corner, bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 }} />
      <Box sx={{ ...corner, bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 }} />
      <Box
        sx={{
          position: 'absolute',
          left: '4%',
          right: '4%',
          height: 3,
          borderRadius: '10px',
          background: 'linear-gradient(90deg, transparent, #00E0F0, transparent)',
          boxShadow: '0 0 16px 2px rgba(0,224,240,0.7)',
          animation: 'scanline 2.2s ease-in-out infinite',
        }}
      />
    </Box>
  );
}
