import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
// NOTE (Nelson, A2): tanstackRouter() below is the CODEGEN plugin for
// FILE-BASED routing (it scans src/routes/ for a __root.tsx etc and
// generates routeTree.gen.ts). Nothing in the repo uses file-based
// routing yet - src/routes.tsx defines the route tree by hand instead
// (createRootRoute/createRoute/createRouter). With no routes/ folder,
// this plugin throws an ENOENT / "rootRouteNode must not be undefined"
// error on every build. Commented out until the app actually migrates
// to file-based routing - re-enable then and add src/routes/__root.tsx.
// import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})
