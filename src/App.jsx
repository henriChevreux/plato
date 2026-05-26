import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { Feed } from './pages/Feed'
import { Search } from './pages/Search'
import { Saved } from './pages/Saved'
import { Topics } from './pages/Topics'
import { Settings } from './pages/Settings'
import { useTheme } from './hooks/useTheme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
})

function ThemeProvider({ children }) {
  useTheme()
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/search" element={<Search />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/topics" element={<Topics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
