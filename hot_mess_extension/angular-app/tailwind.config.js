/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'vscode-foreground': 'var(--vscode-foreground)',
        'vscode-background': 'var(--vscode-editor-background)',
        'vscode-button-background': 'var(--vscode-button-background)',
        'vscode-button-foreground': 'var(--vscode-button-foreground)',
        'vscode-button-hover': 'var(--vscode-button-hoverBackground)',
        'vscode-input-background': 'var(--vscode-input-background)',
        'vscode-input-foreground': 'var(--vscode-input-foreground)',
        'vscode-input-border': 'var(--vscode-input-border)',
        'vscode-panel-background': 'var(--vscode-panel-background)',
        'vscode-panel-border': 'var(--vscode-panel-border)',
        'vscode-success': 'var(--vscode-terminal-ansiGreen)',
        'vscode-error': 'var(--vscode-terminal-ansiRed)',
        'vscode-warning': 'var(--vscode-terminal-ansiYellow)',
        'vscode-info': 'var(--vscode-terminal-ansiBlue)',
        'vscode-progress': 'var(--vscode-progressBar-background)',
        'vscode-selection': 'var(--vscode-selection-background)',
        'vscode-hover': 'var(--vscode-list-hoverBackground)',
        'vscode-active': 'var(--vscode-list-activeSelectionBackground)'
      },
      fontFamily: {
        'mono': ['var(--vscode-editor-font-family)', 'monospace'],
        'sans': ['var(--vscode-font-family)', 'sans-serif']
      },
      fontSize: {
        'vscode-sm': 'var(--vscode-font-size)',
        'vscode-xs': 'calc(var(--vscode-font-size) * 0.85)'
      },
      spacing: {
        'vscode-sm': '4px',
        'vscode-md': '8px',
        'vscode-lg': '12px',
        'vscode-xl': '16px'
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
  corePlugins: {
    // Disable some plugins that might conflict with VSCode theming
    preflight: false,
  },
}
