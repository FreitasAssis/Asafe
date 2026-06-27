// Metro ciente do monorepo: precisa enxergar os pacotes do workspace (packages/*)
// e resolver node_modules tanto no app quanto na raiz. Sem isto o Metro não
// encontra @asafe/core etc. (ver PLANNING.md §4 — pacotes compartilhados).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Observa todo o monorepo (para hot-reload nos pacotes compartilhados).
config.watchFolders = [monorepoRoot];

// 2. Resolve módulos do app primeiro, depois da raiz do monorepo.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
