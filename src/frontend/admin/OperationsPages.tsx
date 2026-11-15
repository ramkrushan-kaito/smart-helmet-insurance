import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { FormEvent, useState } from 'react';
import { CustomerSelect } from './CustomersPage';
import { EmptyState, LoadingBlock, PageHeader, Pager, StatusChip, TableWrap } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useUi } from '../hooks/useAuth';
import { api, day, errorMessage, money, when } from '../services/api';
import { Claim, Customer, Helmet, Page, Payment, Policy, Product, Vehicle } from '../types';

function usePager(path: string) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [extra, setExtra] = useState('');
  const query = `${path}?page=${page}&limit=8${applied ? `&search=${encodeURIComponent(applied)}` : ''}${extra}`;
  const result = useFetch<Page<never>>(query);
  return { page, setPage, search, setSearch, setApplied, extra, setExtra, ...result, query };
}

export function VehiclesPage() {
  const { notify } = useUi();
  const state = usePager('/vehicles');
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [form, setForm] = useState({ registrationNumber: '', type: 'MOTORCYCLE', make: 'DemoMoto', model: '', year: '2024', color: 'Black', chassisNumber: '', engineNumber: '' });
  const data = state.data as Page<Vehicle> | null;

  return (
    <>
      <PageHeader title="Vehicles" subtitle="A helmet can be linked to one of these vehicles." action={<Button variant="contained" onClick={() => setOpen(true)}>Add vehicle</Button>} />
      <SearchBar value={state.search} onChange={state.setSearch} onSubmit={() => { state.setPage(1); state.setApplied(state.search); }} />
      {state.loading ? <LoadingBlock /> : null}
      {state.error ? <Alert severity="error">{state.error}</Alert> : null}
      {data && data.data.length === 0 ? <EmptyState text="No vehicles found." /> : null}
      {data && data.data.length > 0 ? (
        <TableWrap>
          <TableHead><TableRow><TableCell>Code</TableCell><TableCell>Registration</TableCell><TableCell>Vehicle</TableCell><TableCell>Customer</TableCell></TableRow></TableHead>
          <TableBody>
            {data.data.map((vehicle) => (
              <TableRow key={vehicle.id}><TableCell>{vehicle.vehicleCode}</TableCell><TableCell>{vehicle.registrationNumber}</TableCell><TableCell>{vehicle.make} {vehicle.model}</TableCell><TableCell>{vehicle.customer?.fullName}</TableCell></TableRow>
            ))}
          </TableBody>
        </TableWrap>
      ) : null}
      {data ? <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={state.setPage} /> : null}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>Add demo vehicle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <CustomerSelect value={customerId} onChange={setCustomerId} />
            {(['registrationNumber', 'make', 'model', 'year', 'color', 'chassisNumber', 'engineNumber'] as const).map((key) => (
              <TextField key={key} label={key} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
            ))}
            <TextField select label="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              {['MOTORCYCLE', 'SCOOTER', 'MOPED', 'OTHER'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={async () => {
            try {
              await api.post('/vehicles', { ...form, year: Number(form.year), customerId });
              notify('Vehicle saved.');
              setOpen(false);
              state.reload();
            } catch (reason) {
              notify(errorMessage(reason), 'error');
            }
          }}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function ProductsPage() {
  const { notify } = useUi();
  const { data, loading, error, reload } = useFetch<Page<Product>>('/insurance-products?limit=20');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', coverageAmount: '100000', premiumAmount: '999', durationMonths: '12' });
  return (
    <>
      <PageHeader title="Insurance products" subtitle="Fictional products. Premiums are copied onto new policies." action={<Button variant="contained" onClick={() => setOpen(true)}>Add product</Button>} />
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TableWrap>
        <TableHead><TableRow><TableCell>Code</TableCell><TableCell>Name</TableCell><TableCell>Premium</TableCell><TableCell>Cover</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>
          {data?.data.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.code}</TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>{money(product.premiumAmount)}</TableCell>
              <TableCell>{money(product.coverageAmount)}</TableCell>
              <TableCell><Button size="small" onClick={async () => { await api.patch(`/insurance-products/${product.id}`, { isActive: !product.isActive }); notify('Product updated.'); reload(); }}>{product.isActive ? 'Deactivate' : 'Activate'}</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableWrap>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>Add product</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {(['code', 'name', 'description', 'coverageAmount', 'premiumAmount', 'durationMonths'] as const).map((key) => (
              <TextField key={key} label={key} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={async () => {
            try {
              await api.post('/insurance-products', { ...form, coverageAmount: Number(form.coverageAmount), premiumAmount: Number(form.premiumAmount), durationMonths: Number(form.durationMonths) });
              notify('Product saved.');
              setOpen(false);
              reload();
            } catch (reason) {
              notify(errorMessage(reason), 'error');
            }
          }}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function PoliciesPage() {
  const { notify } = useUi();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useFetch<Page<Policy>>(`/policies?page=${page}&limit=8${status ? `&status=${status}` : ''}`);
  const customers = useFetch<Page<Customer>>('/customers?limit=100');
  const products = useFetch<Page<Product>>('/insurance-products?limit=20');
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const vehicles = useFetch<Page<Vehicle>>(customerId ? `/vehicles?customerId=${customerId}&limit=20` : null);
  const helmets = useFetch<Page<Helmet>>(customerId ? `/helmets?customerId=${customerId}&limit=20` : null);
  const [form, setForm] = useState({ vehicleId: '', productId: '', helmetId: '', startDate: '2026-11-15', status: 'ACTIVE' });

  return (
    <>
      <PageHeader title="Policies" subtitle="Every policy belongs to one customer and one vehicle." action={<Button variant="contained" onClick={() => setOpen(true)}>Create policy</Button>} />
      <TextField select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} sx={{ mb: 2, minWidth: 200 }}>
        <MenuItem value="">All</MenuItem>
        {['ACTIVE', 'EXPIRED', 'PENDING', 'CANCELLED'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
      </TextField>
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {data && !data.data.length ? <EmptyState text="No policies found." /> : null}
      {data && data.data.length ? (
        <TableWrap>
          <TableHead><TableRow><TableCell>Number</TableCell><TableCell>Customer</TableCell><TableCell>Vehicle</TableCell><TableCell>Status</TableCell><TableCell>Premium</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {data.data.map((policy) => (
              <TableRow key={policy.id}>
                <TableCell>{policy.policyNumber}</TableCell>
                <TableCell>{policy.customer?.fullName}</TableCell>
                <TableCell>{policy.vehicle?.registrationNumber}</TableCell>
                <TableCell><StatusChip value={policy.status} /></TableCell>
                <TableCell>{money(policy.premiumAmount)}</TableCell>
                <TableCell>
                  {policy.status !== 'CANCELLED' ? <Button size="small" onClick={async () => { await api.patch(`/policies/${policy.id}`, { status: 'CANCELLED' }); notify('Policy cancelled.'); reload(); }}>Cancel</Button> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableWrap>
      ) : null}
      {data ? <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} /> : null}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>Create demo policy</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              {customers.data?.data.map((customer) => <MenuItem key={customer.id} value={customer.id}>{customer.fullName}</MenuItem>)}
            </TextField>
            <TextField select label="Vehicle" value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}>
              {vehicles.data?.data.map((vehicle) => <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.registrationNumber}</MenuItem>)}
            </TextField>
            <TextField select label="Product" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>
              {products.data?.data.map((product) => <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>)}
            </TextField>
            <TextField select label="Helmet" value={form.helmetId} onChange={(event) => setForm({ ...form, helmetId: event.target.value })}>
              <MenuItem value="">None</MenuItem>
              {helmets.data?.data.map((helmet) => <MenuItem key={helmet.id} value={helmet.id}>{helmet.helmetCode}</MenuItem>)}
            </TextField>
            <TextField type="date" label="Start" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
            <TextField select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={async () => {
            try {
              await api.post('/policies', { customerId, vehicleId: form.vehicleId, productId: form.productId, helmetId: form.helmetId || undefined, startDate: form.startDate, status: form.status });
              notify('Policy created.');
              setOpen(false);
              reload();
            } catch (reason) {
              notify(errorMessage(reason), 'error');
            }
          }}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function ClaimsAdminPage() {
  const { notify } = useUi();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useFetch<Page<Claim>>(`/claims?page=${page}&limit=8${status ? `&status=${status}` : ''}`);
  const [selected, setSelected] = useState<Claim | null>(null);
  const [next, setNext] = useState('UNDER_REVIEW');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  return (
    <>
      <PageHeader title="Claims" subtitle="Update status only after reviewing the demo claim." />
      <TextField select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} sx={{ mb: 2, minWidth: 200 }}>
        <MenuItem value="">All</MenuItem>
        {['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
      </TextField>
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {data && data.data.length ? (
        <TableWrap>
          <TableHead><TableRow><TableCell>Claim</TableCell><TableCell>Customer</TableCell><TableCell>Amount</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {data.data.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell>{claim.claimNumber}</TableCell>
                <TableCell>{claim.customer?.fullName}</TableCell>
                <TableCell>{money(claim.claimAmount)}</TableCell>
                <TableCell><StatusChip value={claim.status} /></TableCell>
                <TableCell><Button size="small" onClick={() => { setSelected(claim); setNext(claim.status); }}>Update</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableWrap>
      ) : null}
      {data ? <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} /> : null}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth>
        <DialogTitle>{selected?.claimNumber}</DialogTitle>
        <DialogContent>
          <TextField select fullWidth sx={{ mt: 1 }} label="Status" value={next} onChange={(event) => setNext(event.target.value)}>
            {['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField fullWidth sx={{ mt: 2 }} label="Approved amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <TextField fullWidth sx={{ mt: 2 }} label="Rejection reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
          <Button variant="contained" onClick={async () => {
            if (!selected) return;
            try {
              await api.patch(`/claims/${selected.id}/status`, { status: next, approvedAmount: amount ? Number(amount) : undefined, rejectionReason: reason || undefined });
              notify('Claim updated.');
              setSelected(null);
              reload();
            } catch (reasonError) {
              notify(errorMessage(reasonError), 'error');
            }
          }}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function PaymentsPage() {
  const { notify } = useUi();
  const { data, loading, error, reload } = useFetch<Page<Payment>>('/payments?limit=20');
  const customers = useFetch<Page<Customer>>('/customers?limit=100');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerId: '', amount: '499', purpose: 'PREMIUM', status: 'SUCCESS', method: 'DEMO_UPI' });
  return (
    <>
      <PageHeader title="Payments" subtitle="Demo ledger only. No card or UPI payment is collected." action={<Button variant="contained" onClick={() => setOpen(true)}>Record demo payment</Button>} />
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TableWrap>
        <TableHead><TableRow><TableCell>Ref</TableCell><TableCell>Customer</TableCell><TableCell>Amount</TableCell><TableCell>Purpose</TableCell><TableCell>Status</TableCell><TableCell>When</TableCell></TableRow></TableHead>
        <TableBody>
          {data?.data.map((payment) => (
            <TableRow key={payment.id}><TableCell>{payment.paymentRef}</TableCell><TableCell>{payment.customer?.fullName}</TableCell><TableCell>{money(payment.amount)}</TableCell><TableCell>{payment.purpose}</TableCell><TableCell><StatusChip value={payment.status} /></TableCell><TableCell>{when(payment.paidAt || payment.createdAt)}</TableCell></TableRow>
          ))}
        </TableBody>
      </TableWrap>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>Record demo payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Customer" value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}>
              {customers.data?.data.map((customer) => <MenuItem key={customer.id} value={customer.id}>{customer.fullName}</MenuItem>)}
            </TextField>
            <TextField label="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            <TextField select label="Purpose" value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })}>
              {['PREMIUM', 'RENEWAL', 'CLAIM_SETTLEMENT'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
            <TextField select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
            <TextField select label="Method" value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>
              {['DEMO_UPI', 'DEMO_CARD', 'DEMO_NETBANKING'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={async () => {
            try {
              await api.post('/payments', { ...form, amount: Number(form.amount) });
              notify('Demo payment recorded. No money was collected.');
              setOpen(false);
              reload();
            } catch (reason) {
              notify(errorMessage(reason), 'error');
            }
          }}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

type Note = { id: string; title: string; message: string; isRead: boolean; createdAt: string; user?: { fullName: string } };
type Audit = { id: string; action: string; entity: string; createdAt: string; user?: { fullName: string } | null };

export function NotificationsPage({ admin = false }: { admin?: boolean }) {
  const { notify } = useUi();
  const { data, loading, error, reload } = useFetch<Page<Note>>('/notifications?limit=30');
  if (loading) return <LoadingBlock />;
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <>
      <PageHeader title="Notifications" subtitle={admin ? 'System messages for staff and customers.' : 'Messages about your demo policies and claims.'} action={<Button onClick={async () => { await api.post('/notifications/read-all'); notify('Marked as read.'); reload(); }}>Mark all read</Button>} />
      {!data?.data.length ? <EmptyState text="No notifications." /> : null}
      <Stack spacing={1}>
        {data?.data.map((note) => (
          <Alert key={note.id} severity={note.isRead ? 'success' : 'info'} action={!note.isRead ? <Button color="inherit" size="small" onClick={async () => { await api.patch(`/notifications/${note.id}/read`); reload(); }}>Read</Button> : undefined}>
            <strong>{note.title}</strong> {admin && note.user ? `· ${note.user.fullName}` : ''} — {note.message}
            <div>{when(note.createdAt)}</div>
          </Alert>
        ))}
      </Stack>
    </>
  );
}

export function AuditPage() {
  const [entity, setEntity] = useState('');
  const { data, loading, error } = useFetch<Page<Audit>>(`/audit-logs?limit=30${entity ? `&entity=${encodeURIComponent(entity)}` : ''}`);
  return (
    <>
      <PageHeader title="Audit logs" subtitle="Creates, logins, scans and status changes." />
      <Stack component="form" direction="row" spacing={1} sx={{ mb: 2 }} onSubmit={(event: FormEvent) => event.preventDefault()}>
        <TextField label="Entity filter" value={entity} onChange={(event) => setEntity(event.target.value)} placeholder="helmets" />
      </Stack>
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TableWrap>
        <TableHead><TableRow><TableCell>When</TableCell><TableCell>Action</TableCell><TableCell>Entity</TableCell><TableCell>User</TableCell></TableRow></TableHead>
        <TableBody>
          {data?.data.map((row) => <TableRow key={row.id}><TableCell>{when(row.createdAt)}</TableCell><TableCell>{row.action}</TableCell><TableCell>{row.entity}</TableCell><TableCell>{row.user?.fullName ?? 'Public'}</TableCell></TableRow>)}
        </TableBody>
      </TableWrap>
    </>
  );
}

export function SettingsPage() {
  const { notify } = useUi();
  const { data, loading, error, reload } = useFetch<{ settings: { key: string; value: string }[]; runtime: { demoOtpEnabled: boolean; demoOtp: string | null; smsProvider: string; smsConfigured: boolean; qrPublicBaseUrl: string } }>('/settings');
  const [appName, setAppName] = useState('');
  const [email, setEmail] = useState('');
  if (loading) return <LoadingBlock />;
  if (error || !data) return <Alert severity="error">{error}</Alert>;
  const currentName = data.settings.find((item) => item.key === 'app_name')?.value ?? '';
  const currentEmail = data.settings.find((item) => item.key === 'support_email')?.value ?? '';
  return (
    <>
      <PageHeader title="Settings" subtitle="Secrets stay in environment variables and are not shown here." />
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Alert severity="info">Demo OTP is {data.runtime.demoOtpEnabled ? data.runtime.demoOtp : 'disabled'}. SMS provider: {data.runtime.smsProvider}. SMS configured: {String(data.runtime.smsConfigured)}. QR base URL: {data.runtime.qrPublicBaseUrl}</Alert>
        <TextField label="Application name" defaultValue={currentName} onChange={(event) => setAppName(event.target.value)} />
        <Button variant="outlined" onClick={async () => { await api.patch('/settings', { key: 'app_name', value: appName || currentName }); notify('Name saved.'); reload(); }}>Save name</Button>
        <TextField label="Support email" defaultValue={currentEmail} onChange={(event) => setEmail(event.target.value)} />
        <Button variant="outlined" onClick={async () => { await api.patch('/settings', { key: 'support_email', value: email || currentEmail }); notify('Support email saved.'); reload(); }}>Save email</Button>
      </Stack>
    </>
  );
}

type Staff = { id: string; fullName: string; email: string; status: string; role: { name: string } };

export function StaffPage() {
  const { notify } = useUi();
  const { data, loading, error, reload } = useFetch<Page<Staff>>('/users?limit=20');
  const [form, setForm] = useState({ fullName: '', email: '', password: 'Admin@12345', role: 'ADMIN' });
  return (
    <>
      <PageHeader title="Staff" subtitle="Super admin only. Customers are created on the customer screen." />
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TableWrap>
        <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>
          {data?.data.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.fullName}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.role.name}</TableCell><TableCell><StatusChip value={user.status} /></TableCell>
              <TableCell><Button size="small" onClick={async () => { await api.patch(`/users/${user.id}/status`, { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); reload(); }}>Toggle</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableWrap>
      <Stack component="form" spacing={2} sx={{ maxWidth: 480, mt: 3 }} onSubmit={async (event: FormEvent) => {
        event.preventDefault();
        try {
          await api.post('/users', form);
          notify('Staff account created.');
          reload();
        } catch (reason) {
          notify(errorMessage(reason), 'error');
        }
      }}>
        <TextField label="Name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
        <TextField label="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        <TextField label="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        <TextField select label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <MenuItem value="ADMIN">ADMIN</MenuItem>
          <MenuItem value="SUPER_ADMIN">SUPER_ADMIN</MenuItem>
        </TextField>
        <Button type="submit" variant="contained">Create staff</Button>
      </Stack>
    </>
  );
}

function SearchBar({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <Stack component="form" direction="row" spacing={1} sx={{ mb: 2 }} onSubmit={(event: FormEvent) => { event.preventDefault(); onSubmit(); }}>
      <TextField label="Search" value={value} onChange={(event) => onChange(event.target.value)} fullWidth />
      <Button type="submit" variant="outlined">Search</Button>
    </Stack>
  );
}

void day;
