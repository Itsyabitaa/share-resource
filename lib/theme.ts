export type Theme = 'light' | 'dark'

export const lightTheme = {
  background: '#ffffff',
  text: '#333333',
  primary: '#0070f3',
  secondary: '#666666',
  border: '#e1e5e9',
  codeBackground: '#f1f1f1',
  tableHeader: '#f8f9fa',
  tableBorder: '#ddd',
  blockquoteBorder: '#0070f3',
  blockquoteText: '#666666',
  link: '#0070f3',
  linkHover: '#0051a8',
  buttonBackground: '#0070f3',
  buttonText: '#ffffff',
  buttonHover: '#0051a8',
  inputBackground: '#ffffff',
  inputBorder: '#e1e5e9',
  shadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  cardBackground: '#ffffff',
  divider: '#e1e5e9'
}

export const darkTheme = {
  background: '#1a1a1a',
  text: '#ffffff',
  primary: '#0070f3',
  secondary: '#a0a0a0',
  border: '#333333',
  codeBackground: '#2d2d2d',
  tableHeader: '#333333',
  tableBorder: '#444444',
  blockquoteBorder: '#0070f3',
  blockquoteText: '#a0a0a0',
  link: '#66b3ff',
  linkHover: '#99ccff',
  buttonBackground: '#0070f3',
  buttonText: '#ffffff',
  buttonHover: '#0051a8',
  inputBackground: '#2d2d2d',
  inputBorder: '#444444',
  shadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  cardBackground: '#2d2d2d',
  divider: '#333333'
}

export const getTheme = (theme: Theme) => {
  return theme === 'light' ? lightTheme : darkTheme
}
