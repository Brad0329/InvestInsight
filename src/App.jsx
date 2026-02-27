import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainPage from './pages/MainPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import DevTestPage from './pages/DevTestPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/admin/themes" element={<AdminPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/dev/test" element={<DevTestPage />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
