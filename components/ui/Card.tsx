
import React from 'react';

interface CardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

const Card: React.FC<CardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center transition-transform transform hover:scale-105">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl ${color}`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div className="ml-6">
        <p className="text-xl text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
};

export default Card;
