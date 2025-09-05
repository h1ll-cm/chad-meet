import './globals.css'

export const metadata = {
  title: 'Chad Meet',
  description: 'Video conferencing app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
