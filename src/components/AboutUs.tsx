import { useEffect, useRef } from 'react';

const AboutUs = () => {
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

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" className="about section-padding slide-up" ref={sectionRef}>
      <div className="container about-container">
        <div className="about-text">
          <h4 className="section-subtitle">About Us</h4>
          <h2 className="section-title">Every Great Space Starts with a Great Idea.</h2>
          <p>And that's where we come in. 
At DEV Constructions, we don't believe in simply putting up walls and calling a project complete. We 
listen to your ideas, understand how you want to live, work, and feel in your space—and then bring it all 
together. 
From the first conversation to the final handover, we combine thoughtful design, skilled craftsmanship, 
and hands-on execution to create spaces with purpose and personality. 
Our approach is simple: understand the vision, plan with purpose, and build with precision.</p>
          <div className="founder-info">
            <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80" alt="Yateru Deva Reddy" className="founder-img" />
            <div>
              <h4 className="founder-name">Devsanju Reddy</h4>
              <p className="founder-title">Founder</p>
            </div>
          </div>
        </div>
        <div className="about-image-wrapper">
          <img src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80" alt="Beautiful home interior" className="about-img" />
          <div className="experience-badge">
            <span className="number">  Big Ideas. Precise Execution.</span>
            <span className="text"> Beautiful Results.</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
