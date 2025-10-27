import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  description?: string;
  color: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, value, label, description, color, delay = 0 }) => {
  return (
    <motion.div
      className="stat-card border-l-4"
      style={{ borderColor: color, animationDelay: `${delay}s` }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -8, scale: 1.02 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-4 rounded-2xl shadow-lg" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
          <Icon className="w-10 h-10 text-white" />
        </div>
        <span className="text-5xl font-black gradient-text">{value}</span>
      </div>
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-1">{label}</h3>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </motion.div>
  );
};

export default StatCard;
