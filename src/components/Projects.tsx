import { useEffect, useRef, useState } from 'react';
import { fetchProjects, Project } from '../api/projects';

const Projects = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [projectData, setProjectData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          entries[0].target.classList.add('visible');
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Fetch dynamic project data
    const loadData = async () => {
      try {
        const data = await fetchProjects();
        // Filter projects based on CMS visibility rules
        const visibleProjects = data.filter(
          (p) => p.publishStatus === 'published' && p.showOnLandingPage
        );
        setProjectData(visibleProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <section id="projects" className="projects section-padding slide-up" ref={sectionRef}>
      <div className="container text-center">
        <h4 className="section-subtitle">Portfolio</h4>
        <h2 className="section-title">Our Recent Works</h2>
        
        {loading ? (
          <p style={{ margin: '2rem 0', color: 'var(--text-main)' }}>Loading projects...</p>
        ) : projectData.length === 0 ? (
          <p style={{ margin: '2rem 0', color: 'var(--text-main)' }}>No projects available at the moment.</p>
        ) : (
          <div className="projects-grid">
            {projectData.map(proj => (
              <div className="project-card" key={proj.id}>
                <img src={proj.coverImage} alt={proj.name} />
                <div className="project-info">
                  <h3>{proj.name}</h3>
                  <p>{proj.location}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <a href="#" className="btn btn-outline" style={{ marginTop: '3rem', color: 'var(--text-main)', borderColor: 'var(--text-main)' }}>View All Projects</a>
      </div>
    </section>
  );
};

export default Projects;
