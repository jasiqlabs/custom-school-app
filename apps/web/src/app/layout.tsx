import '@custom-school/design-tokens/tokens.css';
export const metadata = {
  title: 'Get Digital Your School — School ERP Software',
  description: 'Official School ERP Software platform for school operations and administration',
  icons: {
    icon: '/assets/images/get-digital-your-school.png',
    shortcut: '/assets/images/get-digital-your-school.png',
    apple: '/assets/images/get-digital-your-school.png',
  },
};
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html> }
