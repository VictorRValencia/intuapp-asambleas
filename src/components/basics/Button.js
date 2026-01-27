import React from "react";

/**
 * Button Component
 *
 * Standardized button component supporting Primary and Secondary variants.
 *
 * Props:
 * - variant: 'primary' | 'secondary' (default: 'primary')
 * - size: 'S' | 'M' | 'L' (default: 'M')
 * - className: string (additional classes)
 * - disabled: boolean
 * - onClick: function
 * - type: 'button' | 'submit' | 'reset'
 */
const Button = ({
  children,
  variant = "primary",
  size = "M",
  className = "",
  disabled = false,
  type = "button",
  icon = null,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80";

  const sizeStyles = {
    S: "px-4 py-1.5 text-sm",
    M: "px-6 py-2 text-base",
    L: "px-8 py-3 text-lg",
  };

  const variantStyles = {
    primary: `
      bg-primary text-white 
      hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5
      focus:ring-primary-focus
      active:translate-y-0 active:shadow-sm
    `,
    secondary: `
      bg-white text-secondary-text border-2 border-secondary-border
      hover:bg-secondary-hover-bg hover:text-secondary-hover-text hover:shadow-lg
      focus:ring-secondary-border
    `,
    none: "",
  };

  const disabledStyles = disabled
    ? "bg-disabled-bg text-disabled-text border-transparent cursor-not-allowed shadow-none transform-none hover:bg-disabled-bg hover:text-disabled-text hover:shadow-none hover:translate-y-0"
    : "";

  const classes = `
    ${baseStyles}
    ${sizeStyles[size] || sizeStyles.M}
    ${!disabled ? variantStyles[variant] : ""}
    ${disabledStyles}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  const Icon = icon;

  return (
    <button type={type} className={classes} disabled={disabled} {...props}>
      {Icon && <Icon size={20} className="mr-2" />}
      {children}
    </button>
  );
};

export default Button;
