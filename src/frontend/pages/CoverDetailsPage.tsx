import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, ReactNode, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { LoadingBlock } from '../components/ui';
import { cleanName, money } from '../services/api';
import { brand } from '../theme';
import { BuyerDetails, NomineeForm, ScanCompany, ScanResult } from '../types';
import { Page, PlanLogo, Row, Steps, useScan, withGst } from './CoverPage';

const RELATIONS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'];
const MAX_NOMINEES = 4;

const emptyNominee = (share = '100'): NomineeForm => ({ name: '', age: '', relationship: '', share });

function formatAadhaar(value: string) {
  return value.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function adultCutoff() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().slice(0, 10);
}

type Errors = Record<string, string>;

function validate(details: BuyerDetails): Errors {
  const errors: Errors = {};
  const { holder, nominees } = details;
  if (holder.fullName.trim().length < 2) errors.fullName = 'Enter the full name as on Aadhaar.';
  if (!holder.dob) errors.dob = 'Enter date of birth.';
  else if (holder.dob > adultCutoff()) errors.dob = 'Policyholder must be at least 18 years old.';
  if (holder.address.trim().length < 10) errors.address = 'Enter the full address (at least 10 characters).';
  const aadhaar = holder.aadhaar.replace(/\s/g, '');
  if (!/^[2-9]\d{11}$/.test(aadhaar)) errors.aadhaar = 'Enter a valid 12-digit Aadhaar number.';
  nominees.forEach((nominee, index) => {
    if (nominee.name.trim().length < 2) errors[`n${index}.name`] = 'Enter nominee name.';
    const age = Number(nominee.age);
    if (nominee.age === '' || !Number.isInteger(age) || age < 0 || age > 120) errors[`n${index}.age`] = 'Age 0–120.';
    if (!nominee.relationship) errors[`n${index}.relationship`] = 'Choose relationship.';
    const share = Number(nominee.share);
    if (!Number.isInteger(share) || share < 1 || share > 100) errors[`n${index}.share`] = '1–100%.';
  });
  const total = nominees.reduce((sum, nominee) => sum + (Number(nominee.share) || 0), 0);
  if (total !== 100) errors.shareTotal = `Nominee shares must add up to 100%. Now ${total}%.`;
  return errors;
}

export function CoverDetailsPage() {
  const { token = '', code = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { plan?: ScanCompany; result?: ScanResult; details?: BuyerDetails } };
  const fetched = useScan(location.state?.result ? '' : token);
  const result = location.state?.result ?? fetched;
  const plan = location.state?.plan ?? result?.companies.find((item) => item.code === code) ?? null;

  const [details, setDetails] = useState<BuyerDetails>(
    () =>
      location.state?.details ?? {
        holder: {
          fullName: location.state?.result?.customer?.fullName ? cleanName(location.state.result.customer.fullName) : '',
          dob: '',
          address: '',
          aadhaar: '',
        },
        nominees: [emptyNominee()],
      },
  );
  const [submitted, setSubmitted] = useState(false);
  const [confirmed, setConfirmed] = useState(Boolean(location.state?.details));

  if (!result) return <Page><LoadingBlock /></Page>;
  if (!plan) {
    return (
      <Page>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '14px' }}>This plan is not available for this helmet.</Alert>
        <Button variant="contained" onClick={() => navigate(`/cover/${encodeURIComponent(token)}`)}>Back to plans</Button>
      </Page>
    );
  }

  const errors = validate(details);
  const show = (key: string) => (submitted ? errors[key] : undefined);
  const total = details.nominees.reduce((sum, nominee) => sum + (Number(nominee.share) || 0), 0);
  const { total: payable } = withGst(plan.premium);

  const setHolder = (field: keyof BuyerDetails['holder'], value: string) =>
    setDetails((current) => ({ ...current, holder: { ...current.holder, [field]: value } }));

  const setNominee = (index: number, field: keyof NomineeForm, value: string) =>
    setDetails((current) => ({
      ...current,
      nominees: current.nominees.map((nominee, i) => (i === index ? { ...nominee, [field]: value } : nominee)),
    }));

  function splitEvenly(count: number) {
    const base = Math.floor(100 / count);
    return Array.from({ length: count }, (_, i) => String(i === 0 ? 100 - base * (count - 1) : base));
  }

  function addNominee() {
    setDetails((current) => {
      const shares = splitEvenly(current.nominees.length + 1);
      return {
        ...current,
        nominees: [...current.nominees, emptyNominee()].map((nominee, i) => ({ ...nominee, share: shares[i] })),
      };
    });
  }

  function removeNominee(index: number) {
    setDetails((current) => {
      const rest = current.nominees.filter((_, i) => i !== index);
      const shares = splitEvenly(rest.length);
      return { ...current, nominees: rest.map((nominee, i) => ({ ...nominee, share: shares[i] })) };
    });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length || !confirmed) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const clean: BuyerDetails = {
      holder: { ...details.holder, fullName: details.holder.fullName.trim(), address: details.holder.address.trim() },
      nominees: details.nominees.map((nominee) => ({ ...nominee, name: nominee.name.trim() })),
    };
    navigate(`/cover/${encodeURIComponent(token)}/pay/${plan!.code}`, { state: { plan, result, details: clean } });
  }

  const hasErrors = submitted && (Object.keys(errors).length > 0 || !confirmed);

  return (
    <Page
      hero={
        <>
          <Steps active={1} light />
          <Button
            onClick={() => navigate(`/cover/${encodeURIComponent(token)}`)}
            startIcon={<ArrowBackIcon />}
            sx={{ color: 'rgba(255,255,255,0.85)', ml: -1, mb: 0.5 }}
          >
            Change plan
          </Button>
          <Typography variant="h4" sx={{ fontSize: { xs: 26, md: 34 } }}>Policyholder & nominee</Typography>
          <Typography sx={{ opacity: 0.8, mt: 0.5 }}>These details will appear on your policy document.</Typography>
        </>
      }
    >
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, alignItems: 'start' }}>
        <Stack component="form" noValidate onSubmit={onSubmit} spacing={2.5}>
          {hasErrors ? (
            <Alert severity="error" sx={{ borderRadius: '14px' }}>
              {!confirmed && Object.keys(errors).length === 0 ? 'Please confirm the details are correct.' : 'Please fix the highlighted fields.'}
            </Alert>
          ) : null}

          <Section icon={<PersonIcon />} title="Policyholder details" subtitle="As per Aadhaar card">
            <Stack spacing={2}>
              <TextField
                label="Full name"
                value={details.holder.fullName}
                onChange={(event) => setHolder('fullName', event.target.value)}
                error={Boolean(show('fullName'))}
                helperText={show('fullName')}
                autoComplete="name"
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Date of birth"
                  type="date"
                  value={details.holder.dob}
                  onChange={(event) => setHolder('dob', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: adultCutoff() }}
                  error={Boolean(show('dob'))}
                  helperText={show('dob')}
                  fullWidth
                />
                <TextField
                  label="Aadhaar number"
                  value={details.holder.aadhaar}
                  onChange={(event) => setHolder('aadhaar', formatAadhaar(event.target.value))}
                  inputProps={{ inputMode: 'numeric', maxLength: 14 }}
                  placeholder="XXXX XXXX XXXX"
                  error={Boolean(show('aadhaar'))}
                  helperText={show('aadhaar') ?? 'Only the last 4 digits are stored.'}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Address"
                value={details.holder.address}
                onChange={(event) => setHolder('address', event.target.value)}
                error={Boolean(show('address'))}
                helperText={show('address')}
                autoComplete="street-address"
                multiline
                minRows={2}
                fullWidth
              />
            </Stack>
          </Section>

          <Section
            icon={<FamilyRestroomIcon />}
            title="Nominee details"
            subtitle="Who receives the claim amount"
            action={
              <Box sx={{ px: 1.25, py: 0.5, borderRadius: 999, fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0, bgcolor: total === 100 ? '#DCF7E9' : '#FEF0C7', color: total === 100 ? 'success.main' : 'warning.main' }}>
                {total}% of 100%
              </Box>
            }
          >
            <Stack spacing={2}>
              {details.nominees.map((nominee, index) => (
                <Box key={index} sx={{ p: 2, borderRadius: '14px', border: `1px solid ${brand.border}`, bgcolor: brand.soft }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography fontWeight={700}>Nominee {index + 1}</Typography>
                    {details.nominees.length > 1 ? (
                      <IconButton size="small" aria-label={`Remove nominee ${index + 1}`} onClick={() => removeNominee(index)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </Stack>
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1.3fr 1fr' } }}>
                    <TextField
                      label="Name"
                      size="small"
                      value={nominee.name}
                      onChange={(event) => setNominee(index, 'name', event.target.value)}
                      error={Boolean(show(`n${index}.name`))}
                      helperText={show(`n${index}.name`)}
                      sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
                    />
                    <TextField
                      label="Age"
                      size="small"
                      value={nominee.age}
                      onChange={(event) => setNominee(index, 'age', event.target.value.replace(/\D/g, '').slice(0, 3))}
                      inputProps={{ inputMode: 'numeric' }}
                      error={Boolean(show(`n${index}.age`))}
                      helperText={show(`n${index}.age`)}
                    />
                    <TextField
                      select
                      label="Relationship"
                      size="small"
                      value={nominee.relationship}
                      onChange={(event) => setNominee(index, 'relationship', event.target.value)}
                      error={Boolean(show(`n${index}.relationship`))}
                      helperText={show(`n${index}.relationship`)}
                    >
                      {RELATIONS.map((relation) => (
                        <MenuItem key={relation} value={relation}>{relation}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Share"
                      size="small"
                      value={nominee.share}
                      onChange={(event) => setNominee(index, 'share', event.target.value.replace(/\D/g, '').slice(0, 3))}
                      inputProps={{ inputMode: 'numeric' }}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                      error={Boolean(show(`n${index}.share`))}
                      helperText={show(`n${index}.share`)}
                      sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
                    />
                  </Box>
                </Box>
              ))}
              {show('shareTotal') ? <Typography variant="body2" color="error">{show('shareTotal')}</Typography> : null}
              {details.nominees.length < MAX_NOMINEES ? (
                <Button startIcon={<AddIcon />} onClick={addNominee} sx={{ alignSelf: 'flex-start' }}>Add another nominee</Button>
              ) : null}
            </Stack>
          </Section>

          <FormControlLabel
            control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
            label={<Typography variant="body2">I confirm the above details are correct and belong to the policyholder.</Typography>}
            sx={{ color: submitted && !confirmed ? 'error.main' : 'text.secondary', mx: 0 }}
          />

          <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 1.6, fontSize: 17 }}>
            Continue to payment
          </Button>
          <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ color: 'text.secondary' }}>
            <LockIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption" fontWeight={600}>Sent securely · used only for this policy</Typography>
          </Stack>
        </Stack>

        <Paper sx={{ borderRadius: '20px', overflow: 'hidden', boxShadow: brand.shadow, position: { md: 'sticky' }, top: { md: 88 }, order: { xs: -1, md: 0 } }}>
          <Box sx={{ p: 2.5, borderBottom: `1px solid ${brand.border}` }}>
            <Typography variant="overline" color="text.secondary">Selected plan</Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
              <PlanLogo plan={plan} size={44} />
              <Box>
                <Typography fontWeight={800}>{plan.name}</Typography>
                <Typography variant="body2" color="text.secondary">{plan.line}</Typography>
              </Box>
            </Stack>
          </Box>
          <Box sx={{ p: 2.5 }}>
            <Row label="Helmet" value={result.helmet.helmetCode} />
            <Row label="Cover amount" value={money(plan.coverage)} />
            <Row label="Policy term" value={`${plan.months} months`} />
            <Row label="Total payable" value={money(payable)} strong />
          </Box>
        </Paper>
      </Box>
    </Page>
  );
}

function Section({ icon, title, subtitle, action, children }: { icon: ReactNode; title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: '20px', boxShadow: brand.shadow }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: '#E8EEFF', color: 'primary.main' }}>{icon}</Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}
