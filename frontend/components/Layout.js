import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Layout({ children, title = "Ultraviolet Proxy" }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const [uvConfig, setUvConfig] = useState(null);
  const router = useRouter();

  // Register service worker and wait for UV config
  useEffect(() => {
    const initializeProxy = async () => {
      if (typeof window === 'undefined') return;

      // Wait for UV config to be available
      const waitForUVConfig = () => {
        return new Promise((resolve) => {
          const checkConfig = () => {
            if (window.__uv$config) {
              setUvConfig(window.__uv$config);
              resolve(window.__uv$config);
            } else {
              setTimeout(checkConfig, 100);
            }
          };
          checkConfig();
        });
      };

      // Register service worker
      const registerSW = async () => {
        if (!navigator.serviceWorker) {
          console.error("Service workers not supported");
          return false;
        }

        try {
          // Wait for any existing service worker to be ready
          if (navigator.serviceWorker.controller) {
            console.log('Service worker already registered');
            setSwRegistered(true);
            return true;
          }

          const registration = await navigator.serviceWorker.register('/uv/sw.js', {
            scope: '/uv/service/'
          });
          
          // Wait for the service worker to be ready
          await navigator.serviceWorker.ready;
          
          console.log('Service worker registered successfully:', registration);
          setSwRegistered(true);
          return true;
        } catch (error) {
          console.error('Service worker registration failed:', error);
          return false;
        }
      };

      try {
        // Wait for UV config and register service worker
        await Promise.all([
          waitForUVConfig(),
          registerSW()
        ]);
      } catch (error) {
        console.error('Initialization failed:', error);
      }
    };

    initializeProxy();
  }, []);

  // Search function
  const search = (input, template = "https://www.google.com/search?q=%s") => {
    try {
      return new URL(input).toString();
    } catch (err) {}

    try {
      const url = new URL(`http://${input}`);
      if (url.hostname.includes(".")) return url.toString();
    } catch (err) {}

    return template.replace("%s", encodeURIComponent(input));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if service worker and UV config are ready
    if (!swRegistered || !uvConfig) {
      alert('Proxy is still loading. Please wait a moment and try again.');
      return;
    }

    setIsLoading(true);
    
    try {
      const searchResult = search(searchQuery.trim());
      const encodedUrl = uvConfig.encodeUrl(searchResult);
      const proxyUrl = `/uv/service/${encodedUrl}`;
      
      // Navigate to the proxy URL
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Fast and secure web proxy" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <script src="/uv/uv.bundle.js"></script>
        <script src="/uv/uv.config.js"></script>
      </Head>

      {/* Persistent Search Bar */}
      <header style={{
        position: 'sticky', // Back to sticky for better compatibility
        top: 0,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        padding: '12px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* Logo/Home Link */}
          <div 
            onClick={() => router.push('/')}
            style={{
              cursor: 'pointer',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#667eea',
              minWidth: '120px',
              userSelect: 'none'
            }}
          >
            🌐 Ultraviolet
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '600px' }}>
            <div style={{ 
              display: 'flex', 
              gap: '8px',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter URL or search query..."
                disabled={isLoading || !swRegistered}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '25px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  backgroundColor: swRegistered ? '#fff' : '#f5f5f5',
                  opacity: swRegistered ? 1 : 0.7
                }}
                onFocus={(e) => {
                  if (swRegistered) {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e1e5e9';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim() || !swRegistered}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  background: (!swRegistered || isLoading) ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  cursor: (!swRegistered || isLoading) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  minWidth: '60px'
                }}
              >
                {isLoading ? '...' : 'Go'}
              </button>
            </div>
          </form>

          {/* Status Indicator */}
          <div style={{
            fontSize: '12px',
            color: swRegistered ? '#28a745' : '#ffc107',
            minWidth: '80px',
            textAlign: 'right'
          }}>
            {swRegistered ? '✅ Ready' : '⏳ Loading...'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}