import { AppBar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { DemoBanner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../theme';

const drawerWidth = 250;

export function ShellLayout({ items, home }: { items: { to: string; label: string }[]; home: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const drawer = (
    <Box sx={{ width: drawerWidth }}>
      <Toolbar>
        <Typography variant="h6">Kaito Nexus</Typography>
      </Toolbar>
      <Divider />
      <List>
        {items.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end={item.to === home}
            onClick={() => setOpen(false)}
            sx={{ '&.active': { bgcolor: 'action.selected', borderRight: '3px solid #E8A317' } }}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" className="no-print" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {desktop ? null : (
            <IconButton color="inherit" edge="start" onClick={() => setOpen(true)} sx={{ mr: 1 }} aria-label="Open menu">
              <MenuIcon />
            </IconButton>
          )}
          <Typography sx={{ flexGrow: 1 }} variant="h6">
            Kaito Nexus
          </Typography>
          <Typography sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>{user?.fullName}</Typography>
          <Typography
            component="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            sx={{ color: 'inherit', background: 'none', border: 0, cursor: 'pointer', font: 'inherit' }}
          >
            Sign out
          </Typography>
        </Toolbar>
      </AppBar>
      {desktop ? (
        <Drawer variant="permanent" className="no-print" sx={{ width: drawerWidth, [`& .MuiDrawer-paper`]: { width: drawerWidth } }}>
          {drawer}
        </Drawer>
      ) : (
        <Drawer className="no-print" open={open} onClose={() => setOpen(false)}>
          {drawer}
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, ml: { md: `${drawerWidth}px` }, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <DemoBanner />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
