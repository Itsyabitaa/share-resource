export type Theme = 'light' | 'dark'

export const lightTheme = {
  background: '#f1eee6',
  text: '#1c1917',
  primary: '#0f766e',
  secondary: '#57534e',
  border: '#e7e5e4',
  codeBackground: '#eceae6',
  tableHeader: '#f0eeea',
  tableBorder: '#d6d3d1',
  blockquoteBorder: '#0f766e',
  blockquoteText: '#57534e',
  link: '#0f766e',
  linkHover: '#115e59',
  buttonBackground: '#0f766e',
  buttonText: '#ffffff',
  buttonHover: '#115e59',
  inputBackground: '#ffffff',
  inputBorder: '#d6d3d1',
  shadow: '0 24px 80px rgba(48, 36, 21, 0.1)',
  cardBackground: '#fffcf7',
  divider: '#e7e5e4'
}

export const darkTheme = {
  background: '#121110',
  text: '#f5f5f4',
  primary: '#2dd4bf',
  secondary: '#a8a29e',
  border: '#292524',
  codeBackground: '#1c1917',
  tableHeader: '#1c1917',
  tableBorder: '#44403c',
  blockquoteBorder: '#2dd4bf',
  blockquoteText: '#a8a29e',
  link: '#5eead4',
  linkHover: '#99f6e4',
  buttonBackground: '#2dd4bf',
  buttonText: '#042f2e',
  buttonHover: '#5eead4',
  inputBackground: '#1c1917',
  inputBorder: '#44403c',
  shadow: '0 8px 28px rgba(0, 0, 0, 0.35)',
  cardBackground: '#1c1917',
  divider: '#292524'
}

export const getTheme = (theme: Theme) => {
  return theme === 'light' ? lightTheme : darkTheme
}
