import { useState, useEffect } from 'react';
import logo from '../assets/new_logo-removebg-preview.png';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      const sections = ['home', 'about', 'services', 'projects', 'testimonials', 'contact'];
      let current = '';
      
      sections.forEach(sec => {
        const element = document.getElementById(sec);
        if (element) {
          const sectionTop = element.offsetTop;
          const sectionHeight = element.clientHeight;
          if (window.scrollY >= (sectionTop - sectionHeight / 3)) {
            current = sec;
          }
        }
      });
      
      if (current) {
        setActiveLink(current);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#home', label: 'Home' },
    { href: '#about', label: 'About Us' },
    { href: '#services', label: 'Services' },
    { href: '#projects', label: 'Projects' },
    { href: '#testimonials', label: 'Testimonials' },
    { href: '#contact', label: 'Contact' }
  ];

  return (
    <header className={`navbar-floating ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container-floating">
        <a href="#home" className="logo">
          <img src={logo} alt="Dev Constructions logo" className="logo-image" style={{ width: '60px', height: 'auto' }} />
          <span className="logo-text">DEV</span> CONSTRUCTIONS
        </a>
        
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <i className={`fas ${menuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
          <span className="hamburger-text">Menu</span>
        </button>

        <nav className={`nav-menu-floating ${menuOpen ? 'active' : ''}`}>
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <a 
                  href={link.href} 
                  className={`nav-link ${activeLink === link.href.substring(1) ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
