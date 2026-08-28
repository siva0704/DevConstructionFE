import logo from '../assets/new_logo-removebg-preview.png';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <a href="#home" className="logo text-light">
            <img src={logo} alt="Dev Constructions logo" className="logo-image" />
            <span className="logo-text">DEV</span> CONSTRUCTIONS
          </a>
          <p className="footer-desc">  From Concept to Creation 
You bring the vision. We bring the people, planning, and craftsmanship to make it real.</p>
          <div className="social-links">
            <a href="#"><i className="fa-brands fa-instagram"></i></a>
            <a href="#"><i className="fa-brands fa-facebook"></i></a>
            <a href="#"><i className="fa-brands fa-whatsapp"></i></a>
          </div>
        </div>
        
        <div className="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About Us</a></li>
            <li><a href="#services">Services</a></li>
          </ul>
        </div>
        
        <div className="footer-links">
          <h4>Resources</h4>
          <ul>
            <li><a href="#projects">Portfolio</a></li>
            <li><a href="#testimonials">Testimonials</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} DEV CONSTRUCTIONS. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
