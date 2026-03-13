/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
  	extend: {
  		colors: {
  			fg: {
  				DEFAULT: 'var(--figma-color-text, #333)',
  				secondary: 'var(--figma-color-text-secondary, #666)',
  				tertiary: 'var(--figma-color-text-tertiary, #999)',
  				disabled: 'var(--figma-color-text-disabled, #b3b3b3)',
  				onbrand: 'var(--figma-color-text-onbrand, #fff)',
  				danger: 'var(--figma-color-text-danger, #f24822)',
  				warning: 'var(--figma-color-text-warning-secondary, #b35e00)',
  				success: 'var(--figma-color-text-success, #14ae5c)'
  			},
  			bg: {
  				DEFAULT: 'var(--figma-color-bg, #fff)',
  				secondary: 'var(--figma-color-bg-secondary, #f5f5f5)',
  				tertiary: 'var(--figma-color-bg-tertiary, #e6e6e6)',
  				brand: 'var(--figma-color-bg-brand, #0d99ff)',
  				hover: 'var(--figma-color-bg-hover, rgba(0,0,0,0.06))',
  				selected: 'var(--figma-color-bg-selected, #daebf7)',
  				danger: 'var(--figma-color-bg-danger, #fce4e0)',
  				warning: 'var(--figma-color-bg-warning, #fff3e0)',
  				success: 'var(--figma-color-bg-success, #e4f7ec)'
  			},
  			border: {
  				DEFAULT: 'var(--figma-color-border, #e6e6e6)',
  				strong: 'var(--figma-color-border-strong, #c4c4c4)'
  			},
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)'
  			},
  			ring: 'var(--ring)',
  			input: 'var(--input)'
  		},
  		fontSize: {
  			'10': [
  				'10px',
  				{
  					lineHeight: '14px'
  				}
  			],
  			'11': [
  				'11px',
  				'16px'
  			],
  			'12': [
  				'12px',
  				'16px'
  			],
  			'13': [
  				'13px',
  				'20px'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	},
  	keyframes: {
  		typing: {
  			'0%, 100%': {
  				transform: 'translateY(0)',
  				opacity: '0.5'
  			},
  			'50%': {
  				transform: 'translateY(-2px)',
  				opacity: '1'
  			}
  		},
  		'loading-dots': {
  			'0%, 100%': {
  				opacity: '0'
  			},
  			'50%': {
  				opacity: '1'
  			}
  		},
  		wave: {
  			'0%, 100%': {
  				transform: 'scaleY(1)'
  			},
  			'50%': {
  				transform: 'scaleY(0.6)'
  			}
  		},
  		blink: {
  			'0%, 100%': {
  				opacity: '1'
  			},
  			'50%': {
  				opacity: '0'
  			}
  		},
  		shimmer: {
  			'0%': {
  				backgroundPosition: '200% 50%'
  			},
  			'100%': {
  				backgroundPosition: '-200% 50%'
  			}
  		}
  	},
  	'text-blink': {
  		'0%, 100%': {
  			color: 'var(--primary)'
  		},
  		'50%': {
  			color: 'var(--muted-foreground)'
  		}
  	},
  	'bounce-dots': {
  		'0%, 100%': {
  			transform: 'scale(0.8)',
  			opacity: '0.5'
  		},
  		'50%': {
  			transform: 'scale(1.2)',
  			opacity: '1'
  		}
  	},
  	'thin-pulse': {
  		'0%, 100%': {
  			transform: 'scale(0.95)',
  			opacity: '0.8'
  		},
  		'50%': {
  			transform: 'scale(1.05)',
  			opacity: '0.4'
  		}
  	},
  	'pulse-dot': {
  		'0%, 100%': {
  			transform: 'scale(1)',
  			opacity: '0.8'
  		},
  		'50%': {
  			transform: 'scale(1.5)',
  			opacity: '1'
  		}
  	},
  	'shimmer-text': {
  		'0%': {
  			backgroundPosition: '150% center'
  		},
  		'100%': {
  			backgroundPosition: '-150% center'
  		}
  	},
  	'wave-bars': {
  		'0%, 100%': {
  			transform: 'scaleY(1)',
  			opacity: '0.5'
  		},
  		'50%': {
  			transform: 'scaleY(0.6)',
  			opacity: '1'
  		}
  	},
  	shimmer: {
  		'0%': {
  			backgroundPosition: '200% 50%'
  		},
  		'100%': {
  			backgroundPosition: '-200% 50%'
  		}
  	},
  	'spinner-fade': {
  		'0%': {
  			opacity: '0'
  		},
  		'100%': {
  			opacity: '1'
  		}
  	}
  },
  plugins: [],
};
