import "./globals.css";

export const metadata = {
  title: "QuickCart — India Grocery Price Finder",
  description: "Compare grocery prices across Blinkit, Zepto, Swiggy Instamart and BigBasket instantly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
