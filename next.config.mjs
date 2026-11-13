/** @type {import('next').NextConfig} */
// Report links contain a private token, so nothing may leak them (no referrer), index them, or frame them.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/r/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }] },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
  experimental: {
    // The PDF is drawn on the server from font and logo files, so they must travel with the function on Vercel.
    outputFileTracingIncludes: {
      "/": ["./public/waitlist.html"],
      "/r/[token]/pdf": ["./node_modules/@fontsource/playfair-display/files/*.woff", "./node_modules/@fontsource/manrope/files/*.woff", "./public/logo.png", "./public/logo-dark.png"],
    },
  },
};
export default nextConfig;
