import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ImagePlus, X, Save, ArrowLeft } from 'lucide-react';
import { fetchProjectById, createProject, updateProject, Project } from '../../api/projects';

const AdminProjectForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Project>({
    name: '',
    category: 'Residential',
    location: '',
    shortDescription: '',
    projectStatus: 'Completed',
    coverImage: '',
    publishStatus: 'draft',
    showOnLandingPage: false,
  });

  useEffect(() => {
    if (isEditing && id) {
      fetchProjectById(id)
        .then((data) => {
          setFormData(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error(error);
          alert('Failed to load project details.');
          navigate('/admin/projects');
        });
    }
  }, [id, isEditing, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : false;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          coverImage: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, coverImage: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (isEditing && id) {
        await updateProject(id, formData);
      } else {
        await createProject(formData);
      }
      navigate('/admin/projects');
    } catch (error) {
      console.error(error);
      alert('Failed to save project.');
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-page"><p className="admin-loading">Loading...</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-header-title">
          <button onClick={() => navigate('/admin/projects')} className="admin-icon-btn">
            <ArrowLeft size={20} />
          </button>
          <h1>{isEditing ? 'Edit Project' : 'Add New Project'}</h1>
        </div>
      </div>

      <form className="admin-form-container" onSubmit={handleSubmit}>
        <div className="admin-form-main">
          <div className="admin-card">
            <h3>Basic Information</h3>
            
            <div className="admin-form-group">
              <label>Project Name *</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                placeholder="e.g. Modern Villa Construction"
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Category</label>
                <select name="category" value={formData.category} onChange={handleChange}>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Interior">Interior</option>
                  <option value="Renovation">Renovation</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="admin-form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  name="location" 
                  value={formData.location} 
                  onChange={handleChange} 
                  placeholder="e.g. Bengaluru, Karnataka"
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label>Project Status</label>
              <select name="projectStatus" value={formData.projectStatus} onChange={handleChange}>
                <option value="Completed">Completed</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Upcoming">Upcoming</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label>Short Description</label>
              <textarea 
                name="shortDescription" 
                value={formData.shortDescription} 
                onChange={handleChange} 
                rows={4}
                placeholder="A concise description of the project..."
              ></textarea>
            </div>
          </div>
        </div>

        <div className="admin-form-sidebar">
          <div className="admin-card">
            <h3>Publish & Display</h3>
            
            <div className="admin-form-group">
              <label>Publish Status</label>
              <select name="publishStatus" value={formData.publishStatus} onChange={handleChange}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="admin-form-group admin-toggle-group">
              <label>Show on Landing Page</label>
              <label className="admin-toggle">
                <input 
                  type="checkbox" 
                  name="showOnLandingPage" 
                  checked={formData.showOnLandingPage} 
                  onChange={handleChange} 
                />
                <span className="admin-slider"></span>
              </label>
            </div>
          </div>

          <div className="admin-card">
            <h3>Cover Image</h3>
            
            <div className="admin-image-upload">
              {formData.coverImage ? (
                <div className="admin-image-preview">
                  <img src={formData.coverImage} alt="Cover Preview" />
                  <button type="button" className="admin-image-remove" onClick={removeImage}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="admin-image-placeholder" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus size={32} />
                  <p>Click to upload image</p>
                  <span>Supported formats: JPG, PNG, WEBP</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="admin-hidden-input"
              />
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="button" onClick={() => navigate('/admin/projects')} className="admin-btn admin-btn-secondary">
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProjectForm;
