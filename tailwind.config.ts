import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px',
  			'3xl': '2000px'
  		}
  	},
  	extend: {
  		colors: {
  			primary100: '#E0E0E0',
  			primary300: '#4A4A4A',
  			primary400: '#2E2E2E',
  			primary700: '#343434',
  			secondary100: '#E7E7E7',
  			secondary400: '#969799',
  			secondary500: '#595959',
  			gray50: '#F9FAFB',
  			gray100: '#F3F4F6',
  			gray200: '#E5E7EB',
  			gray300: '#71717A',
  			gray500: '#E3E3E3',
  			gray600: '#F4F4F5',
  			slate300: '#CBD5E1',
  			slate400: '#94A3B8',
  			textPrimary: '#11181C',
  			textSecondary: '#09090B',
  			textTertiary: '#696969',
  			borderDefault: '#E4E4E7',
  			borderSecondary: '#DBDBDB',
  			backgroundPrimary: '#444444',
  			backgroundSecondary: '#E7E7E7',
  			backgroundTertiary: '#435E41',
			wedinMain: '#AA4F27',
  			error: '#D32F2F',
  			active: '#F4EEEC',
  			success: '#435E41',
  			info: '#1976D2',
  			warning: '#FBC02D'
  		},
  		width: {
  			'128': '32rem'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'collapsible-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-collapsible-content-height)'
  				}
  			},
  			'collapsible-up': {
  				from: {
  					height: 'var(--radix-collapsible-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'collapsible-down': 'collapsible-down 0.2s ease-out',
  			'collapsible-up': 'collapsible-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
export default config;
