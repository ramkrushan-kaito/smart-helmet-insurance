import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableContainer, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function DemoBanner() {
  return (
    <Alert severity="warning" className="no-print" sx={{ borderRadius: 0 }}>
      DEMO MODE — fictional data only. No SMS is sent. Customer OTP is 123456.
    </Alert>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
      <Box>
        <Typography variant="h4">{title}</Typography>
        {subtitle ? <Typography color="text.secondary">{subtitle}</Typography> : null}
      </Box>
      {action}
    </Stack>
  );
}

const chipColor: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  ACTIVE: 'success',
  ASSIGNED: 'success',
  APPROVED: 'success',
  SETTLED: 'success',
  SUCCESS: 'success',
  VERIFIED: 'success',
  PENDING: 'warning',
  UNDER_REVIEW: 'warning',
  UNASSIGNED: 'warning',
  SUBMITTED: 'info',
  INACTIVE: 'default',
  EXPIRED: 'default',
  RETIRED: 'default',
  CANCELLED: 'error',
  REJECTED: 'error',
  REVOKED: 'error',
  FAILED: 'error',
  LOST: 'error',
  SUSPENDED: 'error',
};

export function StatusChip({ value }: { value?: string | null }) {
  const label = value ?? '—';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 700,
        color: chipColor[label] === 'error' ? 'error.main' : chipColor[label] === 'success' ? 'success.main' : 'text.primary',
        bgcolor: 'action.hover',
      }}
    >
      {label.replaceAll('_', ' ')}
    </Box>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
      <Table size="small">{children}</Table>
    </TableContainer>
  );
}

export function LoadingBlock() {
  return (
    <Stack alignItems="center" sx={{ py: 6 }}>
      <CircularProgress />
    </Stack>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography color="text.secondary">{text}</Typography>
    </Paper>
  );
}

export function Pager({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
      <Button variant="outlined" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <Typography>
        Page {page} of {totalPages} · {total} records
      </Typography>
      <Button variant="outlined" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </Stack>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{body}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
