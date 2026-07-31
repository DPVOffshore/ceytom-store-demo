import "@fontsource-variable/archivo";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

import { RfqProvider } from "@/components/RfqProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { COMPANY } from "@/lib/data";

export const metadata = {
  title: {
    default: `${COMPANY.legalName} — Marine electrical control components, Dubai`,
    template: `%s · ${COMPANY.short}`,
  },
  description:
    "Switchgear, control, signalling and instrumentation components for commercial vessels. Stocked in Dubai, delivered to vessel across the UAE, GCC and worldwide. Prices on request.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <RfqProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-coral focus:px-4 focus:py-2 focus:text-navy"
          >
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </RfqProvider>
      </body>
    </html>
  );
}
