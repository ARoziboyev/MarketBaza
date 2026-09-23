const NAV = [
  { route: 'home', label: 'Bosh sahifa', icon: <path d="M3 9.5 10 3l7 6.5M5 8.5V17h10V8.5" /> },
  { route: 'stats', label: 'Sotuv statistikasi', icon: <path d="M4 16V9M10 16V4M16 16v-6" /> },
  { route: 'daily', label: 'Kunlik daromad', icon: <><rect x="3.5" y="4" width="13" height="12.5" rx="2" /><path d="M3.5 7.5h13M7 3v3M13 3v3" /></> },
  { route: 'sell', label: 'Mahsulot sotish', icon: <><path d="M4 5h12l-1.3 7.5a1.5 1.5 0 0 1-1.5 1.25H6.8a1.5 1.5 0 0 1-1.5-1.25L4 5Z" /><path d="M4 5 3.3 2.6H2" /><circle cx="7.5" cy="17" r="1" /><circle cx="13.5" cy="17" r="1" /></> },
  { route: 'credit', label: "Nasiyaga sotilganlar", icon: <><rect x="2.5" y="5" width="15" height="10" rx="2" /><path d="M2.5 8.5h15" /></> },
  { route: 'add', label: "Mahsulot qo'shish", icon: <><circle cx="10" cy="10" r="7" /><path d="M10 7v6M7 10h6" /></> },
  { route: 'barcodes', label: 'Shtrix-kodlar', icon: <><path d="M3.5 4v12M6.5 4v12M8 4v12M10.5 4v12M13 4v12M15 4v12M16.5 4v12" /></> },
  { route: 'printer', label: 'Chek chiqarish', icon: <><rect x="4" y="7" width="12" height="6.5" rx="1.4" /><path d="M6 7V4h8v3M6.5 16.5h7v-3.2h-7z" /></> },
  { route: 'sold', label: 'Sotilgan mahsulotlar', icon: <><path d="M5 3h10v14l-2.3-1.6L10 17l-2.7-1.6L5 17V3Z" /><path d="M7.3 8h5.4M7.3 10.8h5.4" /></> },
  { route: 'stock', label: 'Qolgan mahsulotlar', icon: <><path d="M3 6.5 10 3l7 3.5-7 3.5-7-3.5Z" /><path d="M3 6.5V14l7 3.5 7-3.5V6.5" /><path d="M10 10v7.5" /></> },
  { route: 'admin', label: 'Boshliq paneli', icon: <path d="M10 2.5 3.5 5v5c0 4 2.8 6.6 6.5 7.5 3.7-.9 6.5-3.5 6.5-7.5V5L10 2.5Z" /> },
];

export default function Sidebar({ route }) {
  return (
    <nav id="sidebar">
      <div className="brand"><span className="brand-mark">M</span>MarketBaza</div>
      {NAV.map((n) => (
        <a key={n.route} className={'nav-link' + (route === n.route ? ' active' : '')} href={'#' + n.route}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">{n.icon}</svg>
          {n.label}
        </a>
      ))}
      <div className="sidebar-foot">MarketBaza &middot; do'kon boshqaruvi<br />ma'lumotlar Supabase'da saqlanadi</div>
    </nav>
  );
}