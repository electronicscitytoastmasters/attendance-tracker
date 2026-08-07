import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import CheckinPage from './CheckinPage.jsx'
import AdminGate from './AdminGate.jsx'
import './index.css'

// ─── Secure URL-based routing ─────────────────────────────────────────────────
//
//  BASE URL  → CheckinPage   (member check-in, safe for everyone)
//  #admin    → AdminGate     (PIN-protected admin, secretary only)
//
//  Security:
//   • The default (no hash, any hash except #admin) ALWAYS renders the member
//     check-in page — there is no way to reach admin by removing the hash.
//   • #admin alone is not enough — the correct PIN is required.
//   • Admin session unlocks only in this tab (sessionStorage, not localStorage).
//
//  URL examples:
//   Member check-in: https://yourname.github.io/attendance/
//                    https://yourname.github.io/attendance/#checkin  (alias)
//   Admin:           https://yourname.github.io/attendance/#admin

function AppRouter() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const isAdminRoute = hash === '#admin';

  return isAdminRoute ? <AdminGate /> : <CheckinPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)

