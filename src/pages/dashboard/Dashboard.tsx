import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import AppNavbar from './components/AppNavbar';
import Header from './components/Header';
import MainGrid from './components/MainGrid';
import SideMenu from './components/SideMenu';
import AppTheme from '../../theme/AppTheme';
import {chartsCustomizations} from './theme/customizations/charts.ts';
import {dataGridCustomizations} from './theme/customizations/dataGrid.ts';
import {datePickersCustomizations} from './theme/customizations/datePickers.ts';

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../api/auth/useAuth';

import CustomerGrid from './components/CustomerGrid';

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
};

export default function Dashboard(props: { disableCustomTheme?: boolean }) {
  
  const { session } = useAuth();
  const [activeView, setActiveView] = React.useState('home');
  if (!session) return <Navigate to="/login" replace />;
  const { fullname, email } = session;

    // Callback function to update activeView from AppNavbar or SideMenu
    const handleViewChange = (view: string) => { setActiveView(view); };
  
  // Only render the dashboard IF authenticated conditional return :?
  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <SideMenu fullName={fullname} email={email} activeView={activeView} onMenuClick={handleViewChange} />
        <AppNavbar fullName={fullname} email={email} activeView={activeView} onMenuClick={handleViewChange} />
        {/* Main content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            bgcolor: 'background.default', // Use bgcolor instead of backgroundColor
            overflow: 'auto',
          }}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              mx: 3,
              pb: 5,
              mt: { xs: 8, md: 0 },
            }}
          >
            <Header activeView={activeView}/>
              {activeView === 'home' && <MainGrid />}           {/* Conditionally render MainGrid */}
              {activeView === 'customers' && <CustomerGrid />}  {/* Conditionally render CustomerGrid */}
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  );
}
