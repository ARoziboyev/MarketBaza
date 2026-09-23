import { useEffect, useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Home from './pages/Home';
import Stats from './pages/Stats';
import Daily from './pages/Daily';
import Sell from './pages/Sell';
import Credit from './pages/Credit';
import AddProduct from './pages/AddProduct';
import Printer from './pages/Printer';
import Sold from './pages/Sold';
import Stock from './pages/Stock';
import Admin from './pages/Admin';
import Barcodes from './pages/Barcodes';
import DatabaseSetup from './components/DatabaseSetup';

const PAGES = {
  home: Home, stats: Stats, daily: Daily, sell: Sell, credit: Credit,
  add: AddProduct, printer: Printer, sold: Sold, stock: Stock, admin: Admin,
  barcodes: Barcodes,
};

function getRoute() {
  return (window.location.hash || '#home').slice(1) || 'home';
}

function Shell() {
  const [route, setRoute] = useState(getRoute());
  const { loading, dbStatus, dbError } = useData();

  useEffect(() => {
    function onHashChange() { setRoute(getRoute()); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const Page = PAGES[route] || Home;

  if (dbStatus === 'missing') return <DatabaseSetup error={dbError} />;
  if (dbStatus === 'error') return <DatabaseSetup error={dbError} />;

  return (
    <div id="app">
      <Sidebar route={route} />
      <main id="content">
        {loading ? (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <div className="em-title">Yuklanmoqda...</div>
            Supabase'dan ma'lumotlar olinmoqda
          </div>
        ) : (
          <Page />
        )}
      </main>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}