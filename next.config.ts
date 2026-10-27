import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the local network load the dev server's JS.
  allowedDevOrigins: ["192.168.100.13"],
  // Dev only: the "N" badge sat over the HUD's pause button. Errors still
  // open the overlay.
  devIndicators: false,
};

export default nextConfig;
