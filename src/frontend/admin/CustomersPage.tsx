import { Alert, Button, MenuItem, Stack, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ConfirmDialog, EmptyState, LoadingBlock, PageHeader, Pager, StatusChip, TableWrap } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { useUi } from '../hooks/useAuth';
import { api, errorMessage } from '../services/api';
import { Customer, Page } from '../types';

export function CustomersPage() {
  const { notify } = useUi();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [pending, setPending] = useState<Customer | null>(null);
  const query = `/customers?page=${page}&limit=8&search=${encodeURIComponent(applied)}`;
  const { data, loading, error, reload } = useFetch<Page<Customer>>(query);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied(search);
  }

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Each customer can hold several helmets, vehicles and policies."
        action={<Button component={RouterLink} to="/admin/customers/new" variant="contained">Add customer</Button>}
      />
      <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }} onSubmit={onSearch}>
        <TextField label="Search name, mobile or code" value={search} onChange={(event) => setSearch(event.target.value)} fullWidth />
        <Button type="submit" variant="outlined">Search</Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading ? <LoadingBlock /> : null}
      {data && data.data.length === 0 ? <EmptyState text="No customers match this search." /> : null}
      {data && data.data.length > 0 ? (
        <TableWrap>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell>City</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.data.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.customerCode}</TableCell>
                <TableCell>{customer.fullName}</TableCell>
                <TableCell>{customer.mobile}</TableCell>
                <TableCell>{customer.city}</TableCell>
                <TableCell>
                  <Button component={RouterLink} to={`/admin/customers/${customer.id}`} size="small">Edit</Button>
                  <Button size="small" color="error" onClick={() => setPending(customer)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableWrap>
      ) : null}
      {data ? <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} /> : null}
      <ConfirmDialog
        open={Boolean(pending)}
        title="Delete customer"
        body={`Soft-delete ${pending?.fullName ?? 'this customer'}? Their login will stop working. This does not remove audit history.`}
        confirmLabel="Delete"
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          try {
            await api.delete(`/customers/${pending.id}`);
            notify('Customer deleted.');
            setPending(null);
            reload();
          } catch (reason) {
            notify(errorMessage(reason), 'error');
          }
        }}
      />
    </>
  );
}

export function CustomerSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { data } = useFetch<Page<Customer>>('/customers?page=1&limit=100');
  return (
    <TextField select label="Customer" value={value} onChange={(event) => onChange(event.target.value)} fullWidth>
      <MenuItem value="">None</MenuItem>
      {data?.data.map((customer) => (
        <MenuItem key={customer.id} value={customer.id}>{customer.customerCode} · {customer.fullName}</MenuItem>
      ))}
    </TextField>
  );
}
