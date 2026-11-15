import { Alert, Button, Stack, TextField } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { PageHeader } from '../components/ui';
import { useUi } from '../hooks/useAuth';
import { api, errorMessage } from '../services/api';
import { Customer } from '../types';

const schema = z.object({
  fullName: z.string().min(2),
  mobile: z.string().regex(/^[6-9][0-9]{9}$/, 'Enter a 10-digit mobile number.'),
  email: z.string().email().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/).or(z.literal('')).optional(),
  dateOfBirth: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useUi();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', mobile: '', email: '', address: '', city: '', state: '', pincode: '', dateOfBirth: '' },
  });

  useEffect(() => {
    if (!id) return;
    api.get<Customer>(`/customers/${id}`).then((response) => {
      const customer = response.data;
      form.reset({
        fullName: customer.fullName,
        mobile: customer.mobile,
        email: customer.email ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        state: customer.state ?? '',
        pincode: customer.pincode ?? '',
        dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : '',
      });
    }).catch((reason) => setError(errorMessage(reason)));
  }, [id, form]);

  return (
    <>
      <PageHeader title={id ? 'Edit customer' : 'Add customer'} subtitle="DEMO DATA. The mobile number is used for OTP login." />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Stack component="form" spacing={2} sx={{ maxWidth: 640 }} onSubmit={form.handleSubmit(async (values) => {
        const payload = {
          ...values,
          email: values.email || undefined,
          pincode: values.pincode || undefined,
          dateOfBirth: values.dateOfBirth || undefined,
        };
        try {
          if (id) await api.patch(`/customers/${id}`, payload);
          else await api.post('/customers', payload);
          notify('Customer saved.');
          navigate('/admin/customers');
        } catch (reason) {
          setError(errorMessage(reason));
        }
      })}>
        <TextField label="Full name" {...form.register('fullName')} error={Boolean(form.formState.errors.fullName)} helperText={form.formState.errors.fullName?.message} />
        <TextField label="Mobile" {...form.register('mobile')} error={Boolean(form.formState.errors.mobile)} helperText={form.formState.errors.mobile?.message} />
        <TextField label="Email" {...form.register('email')} error={Boolean(form.formState.errors.email)} helperText={form.formState.errors.email?.message} />
        <TextField label="Address" {...form.register('address')} />
        <TextField label="City" {...form.register('city')} />
        <TextField label="State" {...form.register('state')} />
        <TextField label="PIN code" {...form.register('pincode')} error={Boolean(form.formState.errors.pincode)} helperText={form.formState.errors.pincode?.message} />
        <TextField label="Date of birth" type="date" InputLabelProps={{ shrink: true }} {...form.register('dateOfBirth')} />
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={form.formState.isSubmitting}>Save</Button>
          <Button onClick={() => navigate('/admin/customers')}>Cancel</Button>
        </Stack>
      </Stack>
    </>
  );
}
