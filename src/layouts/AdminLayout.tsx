import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Admin.css';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>DEV CONSTRUCTIONS</h2>
          <p>ADMIN PANEL</p>
        </div>
        
        <nav className="admin-nav">
          <Link 
            to="/admin" 
            className={`admin-nav-item ${location.pathname === '/admin' ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link 
            to="/admin/projects" 
            className={`admin-nav-item ${location.pathname.startsWith('/admin/projects') ? 'active' : ''}`}
          >
            <FolderKanban size={20} />
            Projects
          </Link>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

