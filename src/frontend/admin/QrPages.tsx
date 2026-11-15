import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { EmptyState, LoadingBlock, PageHeader, Pager, StatusChip, TableWrap } from '../components/ui';
import { useAuth, useUi } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { api, downloadAuthenticated, errorMessage, printQrImage } from '../services/api';
import { Helmet, Page, QrRow } from '../types';

export function QrManagementPage() {
  const { notify } = useUi();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const { data, loading, error, reload } = useFetch<Page<QrRow>>(`/qr-codes?page=${page}&limit=8${status ? `&status=${status}` : ''}${applied ? `&search=${encodeURIComponent(applied)}` : ''}`);

  async function setStatusFor(row: QrRow, next: string) {
    const reason = next === 'REVOKED' ? window.prompt('Reason for revoking this QR code?') ?? '' : undefined;
    if (next === 'REVOKED' && !reason) return;
    try {
      await api.patch(`/qr-codes/${row.id}/status`, { status: next, reason });
      notify(`QR ${row.helmet.helmetCode} is now ${next}.`);
      reload();
    } catch (reasonError) {
      notify(errorMessage(reasonError), 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="QR codes"
        subtitle="Tokens are random. The image stores only the scan URL."
        action={<Stack direction="row" spacing={1}><Button component={RouterLink} to="/admin/qr/generate" variant="contained">Generate</Button><Button component={RouterLink} to="/admin/qr/gallery" variant="outlined">Gallery</Button></Stack>}
      />
      <Stack component="form" direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }} onSubmit={(event: FormEvent) => { event.preventDefault(); setPage(1); setApplied(search); }}>
        <TextField label="Search helmet or token" value={search} onChange={(event) => setSearch(event.target.value)} fullWidth />
        <TextField select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          {['ACTIVE', 'INACTIVE', 'REVOKED'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </TextField>
        <Button type="submit" variant="outlined">Search</Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading ? <LoadingBlock /> : null}
      {data && data.data.length === 0 ? <EmptyState text="No QR codes found." /> : null}
      {data && data.data.length > 0 ? (
        <TableWrap>
          <TableHead><TableRow><TableCell>Helmet</TableCell><TableCell>Status</TableCell><TableCell>Scans</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {data.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.helmet.helmetCode}<br />{row.helmet.brand} {row.helmet.model}</TableCell>
                <TableCell><StatusChip value={row.status} /></TableCell>
                <TableCell>{row.scanCount}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => downloadAuthenticated(`/qr-codes/${row.id}/download`, `${row.helmet.helmetCode}.png`)}>Download</Button>
                  <Button size="small" onClick={() => printQrImage(row.id, row.helmet.helmetCode)}>Print</Button>
                  <Button size="small" onClick={() => setStatusFor(row, 'ACTIVE')}>Activate</Button>
                  <Button size="small" onClick={() => setStatusFor(row, 'INACTIVE')}>Deactivate</Button>
                  <Button size="small" color="error" onClick={() => setStatusFor(row, 'REVOKED')}>Revoke</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableWrap>
      ) : null}
      {data ? <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} /> : null}
    </>
  );
}

export function QrGeneratePage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { notify } = useUi();
  const helmets = useFetch<Page<Helmet>>('/helmets?limit=100');
  const [helmetId, setHelmetId] = useState(params.get('helmetId') ?? '');
  const [reissue, setReissue] = useState(false);
  const [created, setCreated] = useState<{ id: string; scanUrl: string; token: string; alreadyExists?: boolean } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!created) return;
    api.get(`/qr-codes/${created.id}/download`, { responseType: 'blob' }).then((response) => {
      setPreview(URL.createObjectURL(response.data));
    }).catch(() => setPreview(null));
  }, [created]);

  return (
    <>
      <PageHeader title="Generate QR" subtitle="The PNG is saved on the server and the token is stored in PostgreSQL." />
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <TextField select label="Helmet" value={helmetId} onChange={(event) => setHelmetId(event.target.value)}>
          {helmets.data?.data.map((helmet) => <MenuItem key={helmet.id} value={helmet.id}>{helmet.helmetCode} · {helmet.brand}</MenuItem>)}
        </TextField>
        {user?.role === 'SUPER_ADMIN' ? <FormControlLabel control={<Checkbox checked={reissue} onChange={(event) => setReissue(event.target.checked)} />} label="Reissue a new token if one already exists" /> : null}
        <Button variant="contained" disabled={!helmetId} onClick={async () => {
          try {
            const response = await api.post('/qr-codes/generate', { helmetId, reissue });
            setCreated(response.data);
            notify(response.data.alreadyExists ? 'This helmet already has a QR code.' : 'QR code generated.');
          } catch (reason) {
            notify(errorMessage(reason), 'error');
          }
        }}>Generate</Button>
        {created ? (
          <Paper sx={{ p: 2 }} variant="outlined">
            <Typography>Scan URL</Typography>
            <Typography sx={{ wordBreak: 'break-all' }}>{created.scanUrl}</Typography>
            {preview ? <Box component="img" src={preview} alt="Generated QR code" sx={{ width: 240, mt: 2 }} /> : null}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button onClick={() => downloadAuthenticated(`/qr-codes/${created.id}/download`, 'helmet-qr.png')}>Download PNG</Button>
              <Button onClick={() => printQrImage(created.id, 'helmet')}>Print</Button>
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </>
  );
}

export function QrGalleryPage() {
  const { data, loading, error } = useFetch<Page<QrRow>>('/qr-codes?limit=50');
  const [images, setImages] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    data.data.forEach((row) => {
      api.get(`/qr-codes/${row.id}/download`, { responseType: 'blob' }).then((response) => {
        if (!cancelled) setImages((current) => ({ ...current, [row.id]: URL.createObjectURL(response.data) }));
      }).catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [data]);
  if (loading) return <LoadingBlock />;
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <>
      <PageHeader title="QR gallery" subtitle="Print or download a sticker. Personal data is not inside the image." />
      {!data?.data.length ? <EmptyState text="No QR codes yet." /> : null}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
        {data?.data.map((row) => (
          <Paper key={row.id} sx={{ p: 2, textAlign: 'center' }} variant="outlined">
            {images[row.id] ? <Box component="img" alt={row.helmet.helmetCode} src={images[row.id]} sx={{ width: 180 }} /> : <Typography>Loading image…</Typography>}
            <Typography variant="h6">{row.helmet.helmetCode}</Typography>
            <StatusChip value={row.status} />
            <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
              <Button size="small" onClick={() => downloadAuthenticated(`/qr-codes/${row.id}/download`, `${row.helmet.helmetCode}.png`)}>Download</Button>
              <Button size="small" onClick={() => printQrImage(row.id, row.helmet.helmetCode)}>Print</Button>
            </Stack>
          </Paper>
        ))}
      </Box>
    </>
  );
}
