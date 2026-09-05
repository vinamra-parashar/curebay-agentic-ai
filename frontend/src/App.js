import './App.css';
import { createBrowserRouter, RouterProvider, Link, NavLink, Outlet } from "react-router-dom";

// import Header from './components/UIC/Header';
import Home from './pages/home/Home';
import Logs from './pages/logs/Logs';

function Layout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="brand-link">
            <span className="brand-logo-text">Curebay</span>
            <span className="brand-badge">Agentic AI</span>
          </Link>
        </div>
        <nav className="nav">
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            end
          >
            Test Panel Assistant
          </NavLink>
          <NavLink 
            to="/logs" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Agent Audit Logs
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'logs',
        element: <Logs />
      }
    ]
  },
])

function App() {
  return (
    <RouterProvider router={router}></RouterProvider>
  );
}

export default App;
