
import './Solution.css';
import { motion } from 'framer-motion';

export default function Solution() {
  const cards = [
    {
      title: 'Smart Categorization',
      description: 'Automatically classifies your transactions into distinct categories to help you understand your spending patterns.',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      )
    },
    {
      title: 'Seamless Trip Splitting',
      description: 'Split expenses effortlessly with friends on trips. No more complicated math or awkward money conversations.',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      )
    },
    {
      title: 'Real-time Analytics',
      description: 'Visualize your portfolio growth and daily expenses with our intuitive, auto-scaling interactive charts.',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      )
    },
    {
      title: 'Intelligent Budgeting',
      description: 'Set custom budgets and get smart alerts when you are nearing your limits to stay financially healthy.',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      )
    }
  ];

  return (
    <section id="solutions" className="solutions-section">
      <div className="solutions-container">
        <motion.div 
          className="solutions-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="pill">✨ 3. Our Solution</div>
          <h2>Designed for total clarity.</h2>
          <p>We provide all the tools you need to manage your personal finances and group expenses in one premium platform.</p>
        </motion.div>

        <div className="solutions-grid">
          {cards.map((card, index) => (
            <motion.div 
              key={index}
              className="solution-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="card-top">
                <div className="solution-icon">
                  {card.icon}
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
