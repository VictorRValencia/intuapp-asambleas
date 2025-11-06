'use client';
import React from 'react';
import PropTypes from 'prop-types';

/**
 * CustomText - componente reutilizable para texto tipo párrafo (<p>)
 * @param {string} className - clases personalizadas (Tailwind u otras)
 * @param {ReactNode} children - contenido del texto
 */
export default function CustomText({ className = '', children }) {
  return (
    <p className={`text-base text-gray-700 leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

CustomText.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
