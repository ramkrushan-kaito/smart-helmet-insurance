import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { DemoBanner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { api, errorMessage } from '../services/api';
import { SessionUser } from '../types';

const adminSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(adminSchema), defaultValues: { email: '', password: '' } });

  return (
    <Box>
      <DemoBanner />
      <Box sx={{ maxWidth: 440, mx: 'auto', mt: 6, px: 2 }}>
        <Typography variant="h4">Admin sign in</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Demo accounts use the password Admin@12345.
        </Typography>
        <Paper sx={{ p: 3 }} variant="outlined">
          <Stack component="form" spacing={2} onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              const response = await api.post<{ accessToken: string; user: SessionUser }>('/auth/admin/login', values);
              loginWithToken(response.data.accessToken, response.data.user);
              navigate('/admin');
            } catch (reason) {
              setError(errorMessage(reason));
            }
          })}>
            <TextField label="Email" {...form.register('email')} error={Boolean(form.formState.errors.email)} helperText={form.formState.errors.email?.message} />
            <TextField label="Password" type="password" {...form.register('password')} error={Boolean(form.formState.errors.password)} helperText={form.formState.errors.password?.message} />
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Button type="submit" variant="contained" disabled={form.formState.isSubmitting}>
              Sign in
            </Button>
          </Stack>
        </Paper>
        <Button component={RouterLink} to="/login" sx={{ mt: 2 }}>Customer OTP login</Button>
      </Box>
    </Box>
  );
}

const mobileSchema = z.object({ mobile: z.string().regex(/^[6-9][0-9]{9}$/, 'Enter a 10-digit mobile number.') });
const otpSchema = z.object({ otp: z.string().regex(/^[0-9]{6}$/, 'Enter the 6-digit OTP.') });

export function OtpLoginPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [mobile, setMobile] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mobileForm = useForm({ resolver: zodResolver(mobileSchema), defaultValues: { mobile: '' } });
  const otpForm = useForm({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });

  return (
    <Box>
      <DemoBanner />
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 6, px: 2 }}>
        <Typography variant="h4">Customer sign in</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Enter the mobile number on the policy. OTP is 123456.
        </Typography>
        <Paper sx={{ p: 3 }} variant="outlined">
          <Stack component="form" spacing={2} onSubmit={mobileForm.handleSubmit(async (values) => {
            setError(null);
            try {
              const response = await api.post<{ message: string; demoOtp?: string }>('/auth/request-otp', values);
              setMobile(values.mobile);
              setInfo(response.data.message);
              if (response.data.demoOtp) otpForm.setValue('otp', response.data.demoOtp);
            } catch (reason) {
              setError(errorMessage(reason));
            }
          })}>
            <TextField label="Mobile number" {...mobileForm.register('mobile')} error={Boolean(mobileForm.formState.errors.mobile)} helperText={mobileForm.formState.errors.mobile?.message || 'Try 9000000001'} />
            <Button type="submit" variant="outlined" disabled={mobileForm.formState.isSubmitting}>Request OTP</Button>
          </Stack>
          {info ? <Alert sx={{ mt: 2 }} severity="info">{info}</Alert> : null}
          <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={otpForm.handleSubmit(async (values) => {
            setError(null);
            try {
              const response = await api.post<{ accessToken: string; user: SessionUser }>('/auth/verify-otp', { mobile, otp: values.otp });
              loginWithToken(response.data.accessToken, response.data.user);
              navigate('/app');
            } catch (reason) {
              setError(errorMessage(reason));
            }
          })}>
            <TextField label="OTP" {...otpForm.register('otp')} error={Boolean(otpForm.formState.errors.otp)} helperText={otpForm.formState.errors.otp?.message} />
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Button type="submit" variant="contained" disabled={!mobile || otpForm.formState.isSubmitting}>Verify and continue</Button>
          </Stack>
        </Paper>
        <Button component={RouterLink} to="/admin/login" sx={{ mt: 2 }}>Admin login</Button>
      </Box>
    </Box>
  );
}
