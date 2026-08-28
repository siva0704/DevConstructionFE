import { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface FormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const Contact = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setFeedback('');

    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus('error');
      setFeedback('Please fill in all required fields.');
      return;
    }
    if (!emailRegex.test(form.email)) {
      setStatus('error');
      setFeedback('Please enter a valid email address.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setFeedback(data.message || 'Enquiry received! We\'ll get back to you soon.');
        setForm({ name: '', email: '', phone: '', message: '' });
      } else {
        setStatus('error');
        setFeedback(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setFeedback('Network error. Please check your connection and try again.');
    }
  };

  return (
    <section id="contact" className="contact section-padding slide-up" ref={sectionRef}>
      <div className="container contact-container">
        <div className="contact-info-wrap">
          <h4 className="section-subtitle"> Let's Make It Real. </h4>
          <h2 className="section-title"> Got a Dream Space in Mind?</h2>
          <p>Whether you have detailed plans, a Pinterest board full of ideas, or simply a vision you can't quite put into 
words yet—we'd love to hear about it. </p>
          
          <ul className="contact-details">
            <li>
              <i className="fa-solid fa-location-dot"></i>
              <div>
                <h4>Address</h4>
                <p>Hesaraghatta, Bangalore North, Karnataka, India</p>
              </div>
            </li>
            <li>
              <i className="fa-solid fa-phone"></i>
              <div>
                <h4>Phone</h4>
                <p>+91 63616 83154</p>
              </div>
            </li>
            <li>
              <i className="fa-solid fa-envelope"></i>
              <div>
                <h4>Email</h4>
                <p>deventerprises.blr@gmail.com</p>
              </div>
            </li>
            <li>
              <i className="fa-brands fa-instagram"></i>
              <div>
                <h4>Instagram</h4>
                <p>@Dev Constructions</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="contact-form-wrap">
          {status === 'success' ? (
            <div className="contact-success">
              <div className="contact-success-icon">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h3>Enquiry Sent!</h3>
              <p>{feedback}</p>
              <button
                className="btn btn-primary"
                onClick={() => setStatus('idle')}
                style={{ marginTop: '1rem' }}
              >
                Send Another
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              {status === 'error' && feedback && (
                <div className="contact-form-error" role="alert">
                  <i className="fa-solid fa-triangle-exclamation"></i> {feedback}
                </div>
              )}

              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your Name *"
                  required
                  disabled={status === 'loading'}
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Your Email *"
                  required
                  disabled={status === 'loading'}
                  maxLength={200}
                />
              </div>
              <div className="form-group">
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Your Phone Number"
                  disabled={status === 'loading'}
                  maxLength={20}
                />
              </div>
              <div className="form-group">
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Message / Requirements *"
                  rows={4}
                  required
                  disabled={status === 'loading'}
                  maxLength={2000}
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn btn-primary submit-btn"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Sending...
                  </>
                ) : (
                  'Submit Enquiry'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default Contact;
