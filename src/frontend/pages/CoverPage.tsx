import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ShieldIcon from '@mui/icons-material/Shield';
import SportsMotorsportsIcon from '@mui/icons-material/SportsMotorsports';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { LoadingBlock, PublicBar } from '../components/ui';
import { api, cleanName, day, errorMessage, money } from '../services/api';
import { ScanCompany, ScanPurchase, ScanResult } from '../types';

const GST_RATE = 0.18;

function useScan(token: string) {
  const navigate = useNavigate();
  const [result, setResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    api
      .post<ScanResult>('/qr-codes/scan', { token })
      .then((response) => {
        if (live) setResult(response.data);
      })
      .catch((reason) => {
        if (!live) return;
        const message = errorMessage(reason);
        const status = axios.isAxiosError(reason) ? reason.response?.status : undefined;
        navigate('/invalid-qr', { replace: true, state: { message, status } });
      });
    return () => {
      live = false;
    };
  }, [token, navigate]);

  return result;
}

function Page({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PublicBar />
      <Box sx={{ maxWidth: 1040, mx: 'auto', p: { xs: 2, md: 4 } }}>{children}</Box>
    </Box>
  );
}

function Steps({ active }: { active: 0 | 1 | 2 }) {
  const labels = ['Choose plan', 'Payment', 'Policy issued'];
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', rowGap: 1 }}>
      {labels.map((label, index) => (
        <Chip
          key={label}
          label={`${index + 1}. ${label}`}
          color={index <= active ? 'primary' : 'default'}
          variant={index === active ? 'filled' : 'outlined'}
          size="small"
        />
      ))}
    </Stack>
  );
}

function HelmetStrip({ result }: { result: ScanResult }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ bgcolor: 'primary.main', color: 'common.white', borderRadius: 2, p: 1.2, display: 'flex' }}>
          <SportsMotorsportsIcon />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="success.main" sx={{ lineHeight: 1.4 }}>Helmet verified</Typography>
          <Typography fontWeight={700}>
            {result.helmet.helmetCode} · {result.helmet.brand} {result.helmet.model}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {result.customer?.fullName ? cleanName(result.customer.fullName) : 'Rider not linked'}
            {result.vehicle ? ` · ${result.vehicle.registrationNumber}` : ''}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function withGst(premium: number) {
  const gst = Math.round(premium * GST_RATE);
  return { gst, total: premium + gst };
}

export function CoverPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const result = useScan(token);
  const [open, setOpen] = useState<string | null>(null);

  if (!result) return <Page><LoadingBlock /></Page>;

  const plans = [...result.companies].sort((a, b) => a.premium - b.premium);

  return (
    <Page>
      <Steps active={0} />
      <HelmetStrip result={result} />
      <Typography variant="h4">Choose your helmet insurance</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {plans.length} plans · prices include cover from today · GST added at checkout
      </Typography>

      {!plans.length ? (
        <Alert severity="info">
          This helmet is not linked to a rider and vehicle yet, so a policy cannot be bought. Ask the dealer to assign it.
        </Alert>
      ) : null}

      <Stack spacing={2}>
        {plans.map((plan) => {
          const expanded = open === plan.code;
          return (
            <Paper key={plan.code} variant="outlined" sx={{ overflow: 'hidden', borderColor: plan.tag ? 'secondary.main' : 'divider' }}>
              {plan.tag ? (
                <Box sx={{ bgcolor: 'secondary.main', color: '#1d1300', px: 2, py: 0.4, fontSize: 12, fontWeight: 700 }}>{plan.tag}</Box>
              ) : null}
              <Box
                sx={{
                  p: 2.5,
                  display: 'grid',
                  gap: 2,
                  alignItems: 'center',
                  gridTemplateColumns: { xs: '1fr 1fr', md: '1.6fr 1fr 1fr 1fr auto' },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
                  <Box sx={{ bgcolor: '#E8EEF4', color: 'primary.main', borderRadius: 2, p: 1, display: 'flex' }}>
                    <ShieldIcon />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{plan.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{plan.line}</Typography>
                  </Box>
                </Stack>
                <Metric label="Cover amount" value={money(plan.coverage)} />
                <Metric label="Claim settled" value={`${plan.claimRatio}%`} />
                <Metric label="Policy term" value={`${plan.months} months`} />
                <Stack spacing={0.5} sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, alignItems: { md: 'flex-end' } }}>
                  <Typography variant="h5" color="primary.main">
                    {money(plan.premium)}
                    <Typography component="span" variant="body2" color="text.secondary">/{plan.months === 12 ? 'yr' : `${plan.months} mo`}</Typography>
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => navigate(`/cover/${encodeURIComponent(token)}/pay/${plan.code}`, { state: { plan, result } })}
                  >
                    Buy now
                  </Button>
                </Stack>
              </Box>
              <Divider />
              <Button size="small" onClick={() => setOpen(expanded ? null : plan.code)} sx={{ m: 1 }}>
                {expanded ? 'Hide plan details' : 'View plan details'}
              </Button>
              <Collapse in={expanded}>
                <Box sx={{ px: 2.5, pb: 2.5, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                  {plan.features.map((feature) => (
                    <Stack key={feature} direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography variant="body2">{feature}</Typography>
                    </Stack>
                  ))}
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </Stack>
    </Page>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography fontWeight={700}>{value}</Typography>
    </Box>
  );
}

type Method = 'UPI' | 'CARD' | 'NETBANKING';

const METHODS: { id: Method; label: string; hint: string; icon: ReactNode }[] = [
  { id: 'UPI', label: 'UPI', hint: 'GPay, PhonePe, Paytm', icon: <QrCode2Icon /> },
  { id: 'CARD', label: 'Credit / Debit card', hint: 'Visa, Mastercard, RuPay', icon: <CreditCardIcon /> },
  { id: 'NETBANKING', label: 'Net banking', hint: 'All major banks', icon: <AccountBalanceIcon /> },
];

export function CoverPaymentPage() {
  const { token = '', code = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { plan?: ScanCompany; result?: ScanResult } };
  const fetched = useScan(location.state?.result ? '' : token);
  const result = location.state?.result ?? fetched;
  const plan = location.state?.plan ?? result?.companies.find((item) => item.code === code) ?? null;
  const [method, setMethod] = useState<Method>('UPI');
  const [upi, setUpi] = useState('rider@okdemo');
  const [card, setCard] = useState({ number: '4111 1111 1111 1111', expiry: '12/29', cvv: '123', name: 'Demo Rider' });
  const [bank, setBank] = useState('HDFC Bank');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!result) return <Page><LoadingBlock /></Page>;
  if (!plan) {
    return (
      <Page>
        <Alert severity="warning" sx={{ mb: 2 }}>This plan is not available for this helmet.</Alert>
        <Button variant="contained" onClick={() => navigate(`/cover/${encodeURIComponent(token)}`)}>Back to plans</Button>
      </Page>
    );
  }

  const { gst, total } = withGst(plan.premium);

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!plan) return;
    setPaying(true);
    setError(null);
    try {
      // Demo gateway: short pause so the "processing" state is visible.
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const response = await api.post<ScanPurchase>('/qr-codes/scan/buy', {
        token,
        companyCode: plan.code,
        paymentMethod: method,
      });
      navigate(`/cover/${encodeURIComponent(token)}/success`, {
        replace: true,
        state: { purchase: response.data, plan, method, total, helmetCode: result?.helmet.helmetCode },
      });
    } catch (reason) {
      setError(errorMessage(reason));
      setPaying(false);
    }
  }

  return (
    <Page>
      <Steps active={1} />
      <Button onClick={() => navigate(`/cover/${encodeURIComponent(token)}`)} disabled={paying} sx={{ mb: 1, ml: -1 }}>
        ← Change plan
      </Button>
      <Typography variant="h4" sx={{ mb: 3 }}>Complete payment</Typography>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, alignItems: 'start' }}>
        <Paper component="form" onSubmit={pay} variant="outlined" sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>Demo payment. No money is charged.</Alert>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Pay with</Typography>
          <Stack spacing={1.5}>
            {METHODS.map((item) => {
              const selected = method === item.id;
              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  onClick={() => !paying && setMethod(item.id)}
                  sx={{
                    p: 2,
                    cursor: paying ? 'default' : 'pointer',
                    borderColor: selected ? 'primary.main' : 'divider',
                    borderWidth: selected ? 2 : 1,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: 'primary.main', display: 'flex' }}>{item.icon}</Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography fontWeight={700}>{item.label}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.hint}</Typography>
                    </Box>
                    {selected ? <CheckCircleIcon color="primary" /> : null}
                  </Stack>
                  <Collapse in={selected}>
                    <Box sx={{ pt: 2 }} onClick={(event) => event.stopPropagation()}>
                      {item.id === 'UPI' ? (
                        <TextField fullWidth size="small" label="UPI ID" value={upi} onChange={(event) => setUpi(event.target.value)} disabled={paying} />
                      ) : null}
                      {item.id === 'CARD' ? (
                        <Stack spacing={1.5}>
                          <TextField size="small" label="Card number" value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value })} disabled={paying} />
                          <Stack direction="row" spacing={1.5}>
                            <TextField size="small" label="Expiry" value={card.expiry} onChange={(event) => setCard({ ...card, expiry: event.target.value })} disabled={paying} />
                            <TextField size="small" label="CVV" type="password" value={card.cvv} onChange={(event) => setCard({ ...card, cvv: event.target.value })} disabled={paying} />
                          </Stack>
                          <TextField size="small" label="Name on card" value={card.name} onChange={(event) => setCard({ ...card, name: event.target.value })} disabled={paying} />
                        </Stack>
                      ) : null}
                      {item.id === 'NETBANKING' ? (
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Bank"
                          value={bank}
                          onChange={(event) => setBank(event.target.value)}
                          disabled={paying}
                          SelectProps={{ native: true }}
                        >
                          {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'].map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </TextField>
                      ) : null}
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </Stack>
          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
          <Button type="submit" variant="contained" size="large" fullWidth disabled={paying} sx={{ mt: 3, py: 1.4 }}>
            {paying ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={20} color="inherit" />
                <span>Processing payment…</span>
              </Stack>
            ) : (
              `Pay ${money(total)}`
            )}
          </Button>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6">Order summary</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>Helmet {result.helmet.helmetCode}</Typography>
          <Typography fontWeight={700}>{plan.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{plan.line}</Typography>
          <Row label="Cover amount" value={money(plan.coverage)} />
          <Row label="Policy term" value={`${plan.months} months`} />
          <Divider sx={{ my: 1.5 }} />
          <Row label="Premium" value={money(plan.premium)} />
          <Row label="GST (18%)" value={money(gst)} />
          <Divider sx={{ my: 1.5 }} />
          <Row label="Total payable" value={money(total)} strong />
        </Paper>
      </Box>
    </Page>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
      <Typography color={strong ? 'text.primary' : 'text.secondary'} fontWeight={strong ? 700 : 400}>{label}</Typography>
      <Typography fontWeight={strong ? 800 : 600}>{value}</Typography>
    </Stack>
  );
}

const METHOD_LABEL: Record<Method, string> = { UPI: 'UPI', CARD: 'Card', NETBANKING: 'Net banking' };

export function CoverSuccessPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { purchase: ScanPurchase; plan: ScanCompany; method: Method; total: number; helmetCode?: string };
  };
  const state = location.state;

  if (!state) {
    return (
      <Page>
        <Alert severity="info" sx={{ mb: 2 }}>Your policy is saved. Scan the helmet again to buy another plan.</Alert>
        <Button variant="contained" onClick={() => navigate(`/cover/${encodeURIComponent(token)}`, { replace: true })}>Back to plans</Button>
      </Page>
    );
  }

  const { purchase, plan, method, total, helmetCode } = state;

  return (
    <Page>
      <Steps active={2} />
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, maxWidth: 640, mx: 'auto', textAlign: 'center' }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 72 }} />
        <Typography variant="h4" sx={{ mt: 1 }}>Payment successful</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {plan.name} cover is now active{helmetCode ? ` on helmet ${helmetCode}` : ''}.
        </Typography>
        <Box sx={{ textAlign: 'left', bgcolor: 'background.default', borderRadius: 2, p: 2.5 }}>
          <Row label="Policy number" value={purchase.policyNumber} strong />
          <Row label="Payment ref" value={purchase.paymentRef} />
          <Row label="Paid via" value={METHOD_LABEL[method]} />
          <Row label="Amount paid" value={money(total)} />
          <Divider sx={{ my: 1.5 }} />
          <Row label="Cover amount" value={money(purchase.coverageAmount)} />
          <Row label="Valid from" value={day(purchase.startDate)} />
          <Row label="Valid until" value={day(purchase.endDate)} />
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ mt: 3 }}>
          <Button variant="contained" onClick={() => window.print()}>Download receipt</Button>
          <Button variant="outlined" onClick={() => navigate('/scan')}>Scan another helmet</Button>
        </Stack>
      </Paper>
    </Page>
  );
}
