import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { fetchProjects, deleteProject, Project } from '../../api/projects';

const AdminProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the project "${name}"?\nThis action cannot be undone.`)) {
      try {
        await deleteProject(id);
        setProjects(projects.filter(p => p.id !== id));
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('Failed to delete project.');
      }
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Manage Projects</h1>
        <Link to="/admin/projects/new" className="admin-btn admin-btn-primary">
          <Plus size={18} />
          Add New Project
        </Link>
      </div>

      <div className="admin-filters">
        <div className="admin-search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-table-container">
        {loading ? (
          <p className="admin-loading">Loading projects...</p>
        ) : filteredProjects.length === 0 ? (
          <p className="admin-empty-state">No projects found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Project Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>Status</th>
                <th>Landing Page</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(project => (
                <tr key={project.id}>
                  <td>
                    <img src={project.coverImage} alt={project.name} className="admin-table-img" />
                  </td>
                  <td className="admin-font-medium">{project.name}</td>
                  <td>{project.category}</td>
                  <td>{project.location}</td>
                  <td>
                    <span className={`admin-badge ${project.publishStatus === 'published' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                      {project.publishStatus === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${project.showOnLandingPage ? 'admin-badge-info' : 'admin-badge-secondary'}`}>
                      {project.showOnLandingPage ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <Link to={`/admin/projects/${project.id}/edit`} className="admin-icon-btn admin-edit-btn" title="Edit">
                        <Edit size={18} />
                      </Link>
                      <button 
                        onClick={() => handleDelete(project.id!, project.name)} 
                        className="admin-icon-btn admin-delete-btn"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminProjects;
