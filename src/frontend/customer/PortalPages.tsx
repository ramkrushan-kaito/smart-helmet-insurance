import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { EmptyState, LoadingBlock, PageHeader, StatusChip, TableWrap } from '../components/ui';
import { useAuth, useUi } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { api, day, downloadAuthenticated, errorMessage, money, printQrImage } from '../services/api';
import { Claim, Customer, Helmet, Page, Policy, Vehicle } from '../types';
import { TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';

export function ProfilePage() {
  const { user } = useAuth();
  const { notify } = useUi();
  const { data, loading, error, reload } = useFetch<Customer>(user?.customerId ? `/customers/${user.customerId}` : null);
  const [form, setForm] = useState({ address: '', city: '', state: '', pincode: '', email: '' });
  useEffect(() => {
    if (!data) return;
    setForm({ address: data.address ?? '', city: data.city ?? '', state: data.state ?? '', pincode: data.pincode ?? '', email: data.email ?? '' });
  }, [data]);
  if (loading) return <LoadingBlock />;
  if (error || !data) return <Alert severity="error">{error || 'Profile not found.'}</Alert>;
  return (
    <>
      <PageHeader title="Profile" subtitle={`${data.customerCode} · ${data.fullName}`} />
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography>Mobile {data.mobile}. An administrator must change it.</Typography>
        <TextField label="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <TextField label="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        <TextField label="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        <TextField label="State" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
        <TextField label="PIN code" value={form.pincode} onChange={(event) => setForm({ ...form, pincode: event.target.value })} />
        <Button variant="contained" onClick={async () => {
          try {
            await api.patch(`/customers/${data.id}`, { ...form, email: form.email || undefined, pincode: form.pincode || undefined });
            notify('Profile saved.');
            reload();
          } catch (reason) {
            notify(errorMessage(reason), 'error');
          }
        }}>Save</Button>
      </Stack>
    </>
  );
}

export function MyHelmetsPage() {
  const { data, loading, error } = useFetch<Page<Helmet>>('/helmets?limit=50');
  if (loading) return <LoadingBlock />;
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <>
      <PageHeader title="My helmets" />
      {!data?.data.length ? <EmptyState text="No helmets are assigned to you." /> : (
        <TableWrap>
          <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Helmet</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {data?.data.map((helmet) => (
              <TableRow key={helmet.id}><TableCell>{helmet.helmetCode}</TableCell><TableCell>{helmet.brand} {helmet.model}</TableCell><TableCell><StatusChip value={helmet.status} /></TableCell><TableCell><Button component={RouterLink} to={`/app/helmets/${helmet.id}`} size="small">Details</Button></TableCell></TableRow>
            ))}
          </TableBody>
        </TableWrap>
      )}
    </>
  );
}

export function HelmetDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch<Helmet>(id ? `/helmets/${id}` : null);
  if (loading) return <LoadingBlock />;
  if (error || !data) return <Alert severity="error">{error || 'Helmet not found.'}</Alert>;
  return (
    <>
      <PageHeader title={data.helmetCode} subtitle={`${data.brand} ${data.model} · ${data.color} · ${data.size}`} />
      <StatusChip value={data.status} />
      <Typography sx={{ mt: 2 }}>Serial {data.serialNumber}. Made in {data.manufactureYear}.</Typography>
      {data.vehicleMapping ? <Typography>Linked vehicle {data.vehicleMapping.vehicle.registrationNumber}</Typography> : <Typography>No vehicle is linked.</Typography>}
      {data.qrCode ? (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <StatusChip value={data.qrCode.status} />
          <Button onClick={() => downloadAuthenticated(`/qr-codes/${data.qrCode!.id}/download`, `${data.helmetCode}.png`)}>Download QR</Button>
          <Button onClick={() => printQrImage(data.qrCode!.id, data.helmetCode)}>Print</Button>
        </Stack>
      ) : <Typography>No QR code yet.</Typography>}
    </>
  );
}

export function MyVehiclesPage() {
  const { data, loading, error } = useFetch<Page<Vehicle>>('/vehicles?limit=50');
  if (loading) return <LoadingBlock />;
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <>
      <PageHeader title="My vehicles" />
      {!data?.data.length ? <EmptyState text="No vehicles are registered." /> : (
        <TableWrap>
          <TableHead><TableRow><TableCell>Registration</TableCell><TableCell>Vehicle</TableCell><TableCell>Year</TableCell></TableRow></TableHead>
          <TableBody>{data?.data.map((vehicle) => <TableRow key={vehicle.id}><TableCell>{vehicle.registrationNumber}</TableCell><TableCell>{vehicle.make} {vehicle.model}</TableCell><TableCell>{vehicle.year}</TableCell></TableRow>)}</TableBody>
        </TableWrap>
      )}
    </>
  );
}

export function MyPoliciesPage() {
  const { data, loading, error } = useFetch<Page<Policy>>('/policies?limit=50');
  if (loading) return <LoadingBlock />;
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <>
      <PageHeader title="My policies" action={<Button component={RouterLink} to="/app/renewal" variant="outlined">Renewal request</Button>} />
      {!data?.data.length ? <EmptyState text="No policies yet." /> : (
        <TableWrap>
          <TableHead><TableRow><TableCell>Number</TableCell><TableCell>Product</TableCell><TableCell>Status</TableCell><TableCell>Ends</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {data?.data.map((policy) => (
              <TableRow key={policy.id}><TableCell>{policy.policyNumber}</TableCell><TableCell>{policy.product?.name}</TableCell><TableCell><StatusChip value={policy.status} /></TableCell><TableCell>{day(policy.endDate)}</TableCell><TableCell><Button component={RouterLink} to={`/app/policies/${policy.id}`} size="small">Details</Button></TableCell></TableRow>
            ))}
          </TableBody>
        </TableWrap>
      )}
    </>
  );
}

export function PolicyDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch<Policy>(id ? `/policies/${id}` : null);
  if (loading) return <LoadingBlock />;
  if (error || !data) return <Alert severity="error">{error || 'Policy not found.'}</Alert>;
  return (
    <>
      <PageHeader title={data.policyNumber} subtitle={data.product?.name} />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <StatusChip value={data.status} />
        <Typography sx={{ mt: 1 }}>Vehicle {data.vehicle?.registrationNumber}</Typography>
        <Typography>Helmet {data.helmet?.helmetCode ?? 'Not linked'}</Typography>
        <Typography>Cover {money(data.coverageAmount)} · Premium {money(data.premiumAmount)}</Typography>
        <Typography>From {day(data.startDate)} to {day(data.endDate)}</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button component={RouterLink} to={`/app/policies/${data.id}/documents`} variant="outlined">Documents</Button>
          {data.status === 'ACTIVE' ? <Button component={RouterLink} to={`/app/claims/new?policyId=${data.id}`} variant="contained">Submit claim</Button> : null}
          <Button component={RouterLink} to={`/app/renewal?policyId=${data.id}`}>Request renewal</Button>
        </Stack>
      </Paper>
    </>
  );
}

export function PolicyDocumentsPage() {
  const { id } = useParams();
  const { notify } = useUi();
  const { data, loading, error, reload } = useFetch<Policy>(id ? `/policies/${id}` : null);
  if (loading) return <LoadingBlock />;
  if (error || !data) return <Alert severity="error">{error}</Alert>;
  return (
    <>
      <PageHeader title="Policy documents" subtitle={data.policyNumber} />
      {!data.documents?.length ? <EmptyState text="No documents uploaded." /> : data.documents.map((doc) => (
        <Button key={doc.id} onClick={() => downloadAuthenticated(`/policies/${data.id}/documents/${doc.id}/download`, doc.fileName)}>{doc.fileName}</Button>
      ))}
      <Button component="label" variant="contained" sx={{ mt: 2 }}>
        Upload
        <input hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const body = new FormData();
          body.append('file', file);
          try {
            await api.post(`/policies/${data.id}/documents`, body);
            notify('Document uploaded.');
            reload();
          } catch (reason) {
            notify(errorMessage(reason), 'error');
          }
        }} />
      </Button>
    </>
  );
}

export function SubmitClaimPage() {
  const params = new URLSearchParams(window.location.search);
  const navigate = useNavigate();
  const { notify } = useUi();
  const policies = useFetch<Page<Policy>>('/policies?limit=50&status=ACTIVE');
  const [form, setForm] = useState({ policyId: params.get('policyId') ?? '', incidentDate: '2026-11-01', description: '', claimAmount: '5000' });
  return (
    <>
      <PageHeader title="Submit claim" subtitle="Only active policies can accept a claim. This does not pay anyone." />
      <Stack component="form" spacing={2} sx={{ maxWidth: 640 }} onSubmit={async (event: FormEvent) => {
        event.preventDefault();
        try {
          const response = await api.post<Claim>('/claims', { ...form, claimAmount: Number(form.claimAmount) });
          notify('Claim submitted.');
          navigate(`/app/claims/${response.data.id}`);
        } catch (reason) {
          notify(errorMessage(reason), 'error');
        }
      }}>
        <TextField select label="Policy" value={form.policyId} onChange={(event) => setForm({ ...form, policyId: event.target.value })} required>
          {policies.data?.data.map((policy) => <MenuItem key={policy.id} value={policy.id}>{policy.policyNumber}</MenuItem>)}
        </TextField>
        <TextField type="date" label="Incident date" InputLabelProps={{ shrink: true }} value={form.incidentDate} onChange={(event) => setForm({ ...form, incidentDate: event.target.value })} />
        <TextField label="What happened" multiline minRows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
        <TextField label="Claim amount" value={form.claimAmount} onChange={(event) => setForm({ ...form, claimAmount: event.target.value })} />
        <Button type="submit" variant="contained">Submit</Button>
      </Stack>
    </>
  );
}

export function MyClaimsPage() {
  const { data, loading, error } = useFetch<Page<Claim>>('/claims?limit=50');
  if (loading) return <LoadingBlock />;
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <>
      <PageHeader title="My claims" action={<Button component={RouterLink} to="/app/claims/new" variant="contained">Submit claim</Button>} />
      {!data?.data.length ? <EmptyState text="You have not submitted a claim." /> : (
        <TableWrap>
          <TableHead><TableRow><TableCell>Claim</TableCell><TableCell>Status</TableCell><TableCell>Amount</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {data?.data.map((claim) => <TableRow key={claim.id}><TableCell>{claim.claimNumber}</TableCell><TableCell><StatusChip value={claim.status} /></TableCell><TableCell>{money(claim.claimAmount)}</TableCell><TableCell><Button component={RouterLink} to={`/app/claims/${claim.id}`} size="small">Details</Button></TableCell></TableRow>)}
          </TableBody>
        </TableWrap>
      )}
    </>
  );
}

export function ClaimDetailPage() {
  const { id } = useParams();
  const { notify } = useUi();
  const { data, loading, error, reload } = useFetch<Claim>(id ? `/claims/${id}` : null);
  if (loading) return <LoadingBlock />;
  if (error || !data) return <Alert severity="error">{error}</Alert>;
  return (
    <>
      <PageHeader title={data.claimNumber} subtitle={data.policy?.policyNumber} />
      <StatusChip value={data.status} />
      <Typography sx={{ mt: 2 }}>{data.description}</Typography>
      <Typography>Incident {day(data.incidentDate)} · Asked {money(data.claimAmount)} · Approved {money(data.approvedAmount)}</Typography>
      {data.rejectionReason ? <Alert severity="error" sx={{ mt: 2 }}>{data.rejectionReason}</Alert> : null}
      <Stack sx={{ mt: 2 }}>
        {data.documents?.map((doc) => <Button key={doc.id} onClick={() => downloadAuthenticated(`/claims/${data.id}/documents/${doc.id}/download`, doc.fileName)}>{doc.fileName}</Button>)}
        <Button component="label" variant="outlined">Add document
          <input hidden type="file" onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const body = new FormData();
            body.append('file', file);
            try {
              await api.post(`/claims/${data.id}/documents`, body);
              notify('Document added.');
              reload();
            } catch (reason) {
              notify(errorMessage(reason), 'error');
            }
          }} />
        </Button>
      </Stack>
    </>
  );
}

type Renewal = { id: string; status: string; note: string; policy: { policyNumber: string } };

export function RenewalPage() {
  const params = new URLSearchParams(window.location.search);
  const { notify } = useUi();
  const policies = useFetch<Page<Policy>>('/policies?limit=50');
  const requests = useFetch<Renewal[]>('/policies/renewal-requests');
  const [policyId, setPolicyId] = useState(params.get('policyId') ?? '');
  const [note, setNote] = useState('DEMO DATA: please renew this policy. No payment is included.');
  return (
    <>
      <PageHeader title="Renewal request" subtitle="Submitting a request does not collect a premium." />
      <Stack spacing={2} sx={{ maxWidth: 640 }}>
        <TextField select label="Policy" value={policyId} onChange={(event) => setPolicyId(event.target.value)}>
          {policies.data?.data.map((policy) => <MenuItem key={policy.id} value={policy.id}>{policy.policyNumber} · {policy.status}</MenuItem>)}
        </TextField>
        <TextField label="Note" multiline minRows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        <Button variant="contained" onClick={async () => {
          try {
            await api.post(`/policies/${policyId}/renewal-requests`, { note });
            notify('Renewal request sent.');
            requests.reload();
          } catch (reason) {
            notify(errorMessage(reason), 'error');
          }
        }}>Submit</Button>
      </Stack>
      <Typography variant="h6" sx={{ mt: 3 }}>Your requests</Typography>
      {requests.loading ? <LoadingBlock /> : null}
      {!requests.data?.length ? <EmptyState text="No renewal requests yet." /> : requests.data.map((item) => (
        <Typography key={item.id} sx={{ py: 1 }}>{item.policy.policyNumber} · {item.status} · {item.note}</Typography>
      ))}
    </>
  );
}
