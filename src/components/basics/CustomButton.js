'use client';
import React from 'react';
import PropTypes from 'prop-types';

/**
 * CustomButton - botón reutilizable completamente controlado por className.
 * @param {ReactNode} children - contenido del botón (texto o ícono)
 * @param {function} onClick - función al hacer clic
 * @param {string} className - clases de estilo externas (Tailwind u otras)
 * @param {string} type - tipo de botón (button, submit, reset)
 * @param {boolean} disabled - desactiva el botón si es true
 */
export default function CustomButton({
  children,
  onClick,
  className = '',
  type = 'button',
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

CustomButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  disabled: PropTypes.bool,
};
