'use client';
import React from 'react';
import PropTypes from 'prop-types';

/**
 * CustomTitle - componente flexible para renderizar encabezados (h1–h6)
 * @param {string} level - nivel del encabezado (h1, h2, h3, h4, h5, h6)
 * @param {string} className - clases personalizadas para Tailwind u otras
 * @param {ReactNode} children - contenido del título
 */
export default function CustomTitle({ level = 'h2', className = '', children }) {
  const HeadingTag = level; // dinámicamente elige h1–h6

  const baseStyles = {
    h1: 'text-[40px] font-bold',
    h2: 'text-3xl font-semibold',
    h3: 'text-2xl font-semibold',
    h4: 'text-xl font-medium',
    h5: 'text-lg font-medium',
    h6: 'text-base font-normal',
  };

  return (
    <HeadingTag className={`${baseStyles[level] || ''} ${className}`}>
      {children}
    </HeadingTag>
  );
}

CustomTitle.propTypes = {
  level: PropTypes.oneOf(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']),
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
