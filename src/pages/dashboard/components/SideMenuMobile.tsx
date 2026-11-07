import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';

import MenuButton from './MenuButton';
import MenuContent from './MenuContent';
import { useAuth } from '../../../api/auth/useAuth';

interface SideMenuMobileProps {
  fullName: string;
  email: string;
  activeView: string;
  onMenuClick: (view: string) => void;
  open: boolean;
  toggleDrawer: (newOpen: boolean) => () => void;
}

export default function SideMenuMobile({ open, toggleDrawer, fullName, email, activeView, onMenuClick }: SideMenuMobileProps) {
  const { logout } = useAuth();
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={toggleDrawer(false)}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        [`& .${drawerClasses.paper}`]: {
          backgroundImage: 'none',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Stack
        sx={{
          maxWidth: '70dvw',
          height: '100%',
        }}
      >
        <Stack direction="row" sx={{ p: 2, pb: 0, gap: 1 }}>
          <Stack
            direction="row"
            sx={{ gap: 1, alignItems: 'center', flexGrow: 1, p: 1 }}
          >
            <Avatar
              sizes="small"
              alt={fullName}
              sx={{ width: 24, height: 24 }}
            />
            <Typography component="p" variant="h6">
              {fullName}
            </Typography>
          </Stack>
          <MenuButton showBadge>
            <NotificationsRoundedIcon />
          </MenuButton>
        </Stack>
        <Typography variant="caption" sx={{ px: 3, pb: 2 }}>{email}</Typography>
        <Divider />
        <Stack sx={{ flexGrow: 1 }}>
          <MenuContent activeView={activeView} onMenuClick={(view) => {
            onMenuClick(view);
            toggleDrawer(false)();
          }} />
          <Divider />
        </Stack>
        <Stack sx={{ p: 2 }}>
          <Button variant="outlined" fullWidth startIcon={<LogoutRoundedIcon />} onClick={logout}>
            Logout
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
