import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Stack, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CustomerSelect } from './CustomersPage';
import { EmptyState, LoadingBlock, PageHeader, Pager, StatusChip, TableWrap } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useUi } from '../hooks/useAuth';
import { api, errorMessage } from '../services/api';
import { Helmet, Page, Vehicle } from '../types';

export function HelmetsPage() {
  const [params] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const query = `/helmets?page=${page}&limit=8${applied ? `&search=${encodeURIComponent(applied)}` : ''}${status ? `&status=${status}` : ''}`;
  const { data, loading, error } = useFetch<Page<Helmet>>(query);

  return (
    <>
      <PageHeader title="Helmets" subtitle="Every helmet gets a unique Helmet ID." action={<Button component={RouterLink} to="/admin/helmets/new" variant="contained">Register helmet</Button>} />
      <Stack component="form" direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }} onSubmit={(event: FormEvent) => { event.preventDefault(); setPage(1); setApplied(search); }}>
        <TextField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} fullWidth />
        <TextField select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
          <MenuItem value="">All</MenuItem>
          {['UNASSIGNED', 'ASSIGNED', 'RETIRED', 'LOST'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </TextField>
        <Button type="submit" variant="outlined">Search</Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading ? <LoadingBlock /> : null}
      {data && data.data.length === 0 ? <EmptyState text="No helmets found." /> : null}
      {data && data.data.length > 0 ? (
        <TableWrap>
          <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Helmet</TableCell><TableCell>Customer</TableCell><TableCell>Status</TableCell><TableCell>QR</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {data.data.map((helmet) => (
              <TableRow key={helmet.id}>
                <TableCell>{helmet.helmetCode}</TableCell>
                <TableCell>{helmet.brand} {helmet.model}</TableCell>
                <TableCell>{helmet.customer?.fullName ?? 'Unassigned'}</TableCell>
                <TableCell><StatusChip value={helmet.status} /></TableCell>
                <TableCell><StatusChip value={helmet.qrCode?.status ?? 'NONE'} /></TableCell>
                <TableCell>
                  <Button component={RouterLink} to={`/admin/helmets/${helmet.id}`} size="small">Edit</Button>
                  <Button component={RouterLink} to={`/admin/qr/generate?helmetId=${helmet.id}`} size="small">QR</Button>
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

export function HelmetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useUi();
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [generateQr, setGenerateQr] = useState(true);
  const [fields, setFields] = useState({ brand: 'NexusGuard', model: '', color: '', size: 'M', serialNumber: '', manufactureYear: '2025' });
  const vehicles = useFetch<Page<Vehicle>>(customerId ? `/vehicles?customerId=${customerId}&limit=50` : null);

  useEffect(() => {
    if (!id) return;
    api.get<Helmet>(`/helmets/${id}`).then((response) => {
      const helmet = response.data;
      setCustomerId(helmet.customerId ?? '');
      setVehicleId(helmet.vehicleMapping?.vehicle.id ?? '');
      setFields({
        brand: helmet.brand,
        model: helmet.model,
        color: helmet.color,
        size: helmet.size,
        serialNumber: helmet.serialNumber,
        manufactureYear: String(helmet.manufactureYear),
      });
    }).catch((reason) => setError(errorMessage(reason)));
  }, [id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (id) {
        await api.patch(`/helmets/${id}`, {
          brand: fields.brand,
          model: fields.model,
          color: fields.color,
          size: fields.size,
          manufactureYear: Number(fields.manufactureYear),
          customerId: customerId || null,
          vehicleId: vehicleId || null,
        });
      } else {
        await api.post('/helmets', {
          ...fields,
          manufactureYear: Number(fields.manufactureYear),
          customerId: customerId || undefined,
          generateQr,
        });
      }
      notify('Helmet saved.');
      navigate('/admin/helmets');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  return (
    <>
      <PageHeader title={id ? 'Edit helmet' : 'Register helmet'} subtitle="A unique Helmet ID is assigned by the server." />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Stack component="form" spacing={2} sx={{ maxWidth: 640 }} onSubmit={save}>
        <TextField label="Brand" value={fields.brand} onChange={(event) => setFields({ ...fields, brand: event.target.value })} required />
        <TextField label="Model" value={fields.model} onChange={(event) => setFields({ ...fields, model: event.target.value })} required />
        <TextField label="Color" value={fields.color} onChange={(event) => setFields({ ...fields, color: event.target.value })} required />
        <TextField label="Size" value={fields.size} onChange={(event) => setFields({ ...fields, size: event.target.value })} required />
        <TextField label="Serial number" value={fields.serialNumber} onChange={(event) => setFields({ ...fields, serialNumber: event.target.value })} required disabled={Boolean(id)} />
        <TextField label="Manufacture year" type="number" value={fields.manufactureYear} onChange={(event) => setFields({ ...fields, manufactureYear: event.target.value })} required />
        <CustomerSelect value={customerId} onChange={setCustomerId} />
        {id ? (
          <TextField select label="Linked vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
            <MenuItem value="">None</MenuItem>
            {vehicles.data?.data.map((vehicle) => <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.registrationNumber}</MenuItem>)}
          </TextField>
        ) : (
          <FormControlLabel control={<Checkbox checked={generateQr} onChange={(event) => setGenerateQr(event.target.checked)} />} label="Generate QR code now" />
        )}
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained">Save</Button>
          <Button onClick={() => navigate('/admin/helmets')}>Cancel</Button>
        </Stack>
      </Stack>
    </>
  );
}
