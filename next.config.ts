import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The floating dev badge sits on top of the account menu; the terminal shows the same information.
  devIndicators: false,
}

export default nextConfig
