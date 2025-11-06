'use client';
import React from 'react';
import PropTypes from 'prop-types';

/**
 * CustomInput - campo de texto reutilizable con label y estilos personalizados.
 * @param {string} label - etiqueta del campo
 * @param {string} placeholder - texto de ayuda dentro del input
 * @param {string} className - clases adicionales (Tailwind u otras)
 * @param {object} rest - cualquier otra prop estándar de input (onChange, value, type, etc.)
 */
export default function CustomInput({ label, placeholder, className = '', ...rest }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-gray-800 text-sm font-bold">
          {label}
        </label>
      )}
      <input
        placeholder={placeholder}
        className="
          bg-white
          rounded-lg 
          border 
          border-gray-300 
          px-5
          py-4
          text-gray-800 
          focus:outline-none 
          focus:ring-2 
          focus:ring-blue-500 
          placeholder-gray-400
        "
        {...rest}
      />
    </div>
  );
}

CustomInput.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  className: PropTypes.string,
};
