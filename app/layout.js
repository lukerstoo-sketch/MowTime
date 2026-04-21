export const metadata = {
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
