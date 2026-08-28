import { useEffect, useRef } from 'react';

const Testimonials = () => {
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
    <section id="testimonials" className="testimonials section-padding bg-light slide-up" ref={sectionRef}>
      <div className="container text-center">
        <h4 className="section-subtitle">Client Reviews</h4>
        <h2 className="section-title">What They Say</h2>
        
        <div className="testimonial-grid">
          <div className="testimonial-card">
            <i className="fa-solid fa-quote-left quote-icon"></i>
            <p className="testimonial-text">"Dev Constructions brought our dream home to life. The attention to detail in the interiors was impeccable."</p>
            <h4 className="client-name">Kiran Kumar</h4>
            <p className="client-location">Bangalore</p>
          </div>
          <div className="testimonial-card">
            <i className="fa-solid fa-quote-left quote-icon"></i>
            <p className="testimonial-text">"Professional execution from the ground up. The team was highly responsive and delivered the project on time."</p>
            <h4 className="client-name">Priyanka V.</h4>
            <p className="client-location">Chikkamagalur</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
