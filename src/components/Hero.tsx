import { useEffect, useRef } from 'react';

const Hero = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // We replicate the 'visible' class from CSS by mounting it immediately or intersection observation
    if (contentRef.current) {
      setTimeout(() => {
        contentRef.current?.classList.add('visible');
      }, 100);
    }
  }, []);

  return (
    <section id="home" className="hero">
      <div className="hero-overlay"></div>
      <div className="container hero-content text-reveal slide-up" ref={contentRef}>
        <h1 className="hero-title"> Dream It. Design It,<span>Build It</span></h1>
        <p className="hero-subtitle"> From the first idea to the final detail, DEV Constructions brings your vision to life 
through thoughtful design, quality construction, and spaces made for the way you live.</p>
        <div className="hero-btns">
          <a href="#projects" className="btn btn-primary">VIEW OUR PROJECTS </a>
          <a href="#contact" className="btn btn-outline">LET'S BUILD TOGETHER</a>
        </div>
      </div>
      <div className="scroll-indicator">
        <div className="mouse">
          <div className="wheel"></div>
        </div>
        <p> ARCHITECTURE • CONSTRUCTION • INTERIORS </p>
      </div>
    </section>
  );
};

export default Hero;
