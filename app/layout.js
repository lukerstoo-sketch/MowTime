export const metadata = {
  icons: {
    icon: "/favicon.ico",
  },
  title: "MowTime",
  description: "Find the best upcoming time to mow your lawn.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
