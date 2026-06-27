/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pacotes internos do monorepo são TS-source (sem build próprio): o Next transpila.
  transpilePackages: ["@asafe/core", "@asafe/chordpro"],
};

export default nextConfig;
