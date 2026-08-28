import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Globe, FileEdit, Plus } from 'lucide-react';
import { fetchProjects, Project } from '../../api/projects';

const AdminDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetchProjects().then(setProjects).catch(console.error);
  }, []);

  const totalProjects = projects.length;
  const publishedProjects = projects.filter(p => p.publishStatus === 'published').length;
  const draftProjects = projects.filter(p => p.publishStatus === 'draft').length;
  
  // Sort projects by createdAt and get the latest 5
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Dashboard</h1>
        <Link to="/admin/projects/new" className="admin-btn admin-btn-primary">
          <Plus size={18} />
          Add New Project
        </Link>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', color: '#3498db' }}>
            <FolderKanban size={24} />
          </div>
          <div className="admin-stat-info">
            <h3>Total Projects</h3>
            <p>{totalProjects}</p>
          </div>
        </div>
        
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71' }}>
            <Globe size={24} />
          </div>
          <div className="admin-stat-info">
            <h3>Published</h3>
            <p>{publishedProjects}</p>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ backgroundColor: 'rgba(241, 196, 15, 0.1)', color: '#f1c40f' }}>
            <FileEdit size={24} />
          </div>
          <div className="admin-stat-info">
            <h3>Drafts</h3>
            <p>{draftProjects}</p>
          </div>
        </div>
      </div>

      <div className="admin-dashboard-section">
        <h2>Recently Added Projects</h2>
        <div className="admin-recent-projects">
          {recentProjects.length === 0 ? (
            <p className="admin-empty-state">No projects found. Add your first project!</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map(project => (
                  <tr key={project.id}>
                    <td>{project.name}</td>
                    <td>{project.category}</td>
                    <td>
                      <span className={`admin-badge ${project.publishStatus === 'published' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                        {project.publishStatus === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/admin/projects/${project.id}/edit`} className="admin-link-btn">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
