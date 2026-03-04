import React from 'react';

const Button = ({
    children,
    onClick,
    variant = 'primary',
    className = '',
    type = 'button',
    disabled = false,
    icon: Icon
}) => {
    const baseStyles = "glass-button px-6 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-indigo-600/80 hover:bg-indigo-500/90 text-white shadow-lg shadow-indigo-500/30",
        secondary: "bg-white/10 hover:bg-white/20 text-white",
        danger: "bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-500/30",
        success: "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-500/30",
        ghost: "bg-transparent border-transparent hover:bg-white/5 text-gray-300"
    };

    return (
        <button
            type={type}
            className={`${baseStyles} ${variants[variant]} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {Icon && <Icon size={18} />}
            {children}
        </button>
    );
};

export default Button;
