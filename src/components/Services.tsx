import { useEffect, useRef } from 'react';

const Services = () => {
  const sectionRef = useRef<HTMLElement>(null);

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

  return (
    <section id="services" className="services section-padding bg-dark slide-up" ref={sectionRef}>
      <div className="container text-center">
        <h4 className="section-subtitle">Our Expertise</h4>
        <h2 className="section-title text-light">One Vision. Every Detail Taken Care Of.</h2>
        <p className="section-desc text-light-muted">Whether you're building from the ground up or transforming the space you already have, we're here to 
make the journey simpler—and the final result extraordinary.</p>
        
        <div className="services-grid">
          <div className="service-card">
            <i className="fa-solid fa-helmet-safety service-icon"></i>
            <h3>Construction 
Built Strong. Built Smart. Built for You.</h3>
            <p>From foundations to finishing, we manage the journey of turning your plans into a place you can proudly 
call your own.</p>
          </div>
          <div className="service-card highlight-card">
            <i className="fa-solid fa-couch service-icon"></i>
            <h3>House Interiors 
Spaces That Feel Like You.

</h3>
            <p>Beautiful isn't enough. Your interiors should work for your lifestyle, reflect your personality, and feel right 
every single day.</p>
          </div>
          <div className="service-card">
            <i className="fa-solid fa-compass-drafting service-icon"></i>
            <h3>Design & Execution 
You Imagine It. We Make It Happen. </h3>
            <p>From concept and planning to coordination and completion, we bring all the moving pieces together—so 
your vision doesn't get lost along the way. </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
