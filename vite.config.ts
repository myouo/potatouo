import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            {
              name: 'recharts-state',
              test: /node_modules[\\/]recharts[\\/]es6[\\/](?:context|state|synchronisation)[\\/]/,
              priority: 40,
            },
            {
              name: 'recharts-cartesian',
              test: /node_modules[\\/]recharts[\\/]es6[\\/](?:cartesian|chart)[\\/]/,
              priority: 40,
            },
            {
              name: 'recharts-primitives',
              test: /node_modules[\\/]recharts[\\/]es6[\\/](?:animation|component|container|polar|shape|zIndex)[\\/]/,
              priority: 40,
            },
            {
              name: 'recharts-core',
              test: /node_modules[\\/](?:recharts|victory-vendor)[\\/]/,
              priority: 30,
            },
            {
              name: 'd3',
              test: /node_modules[\\/](?:d3-[^\\/]+|internmap)[\\/]/,
              priority: 30,
            },
            {
              name: 'chart-state',
              test: /node_modules[\\/](?:@reduxjs|immer|react-redux|redux|redux-thunk|reselect|use-sync-external-store)[\\/]/,
              priority: 30,
            },
            {
              name: 'date-fns',
              test: /node_modules[\\/]date-fns[\\/]/,
              priority: 30,
            },
          ],
        },
      },
    },
  },
})
