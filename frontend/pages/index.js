import Head from "next/head";
import { useEffect, useState } from "react";

export default function Home() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Function to handle the actual proxy navigation
 // Replace your handleProxyNavigation function with this improved version:

const handleProxyNavigation = async (address) => {
  console.log("[handleProxyNavigation] Invoked with address:", address);

  console.log("Navigating to:", address);
  
  // Get the iframe element
  const frame = document.getElementById("uv-frame");
  if (!frame) {
    console.error("Frame not found");
    return;
  }

  try {
    // Make sure the service worker is registered and ready
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log("Service worker ready:", registration);
    }
console.log("[iframe] Final frame src is:", frame.src);

    // Wait a moment for everything to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Try different proxy paths - adjust these based on your actual Ultraviolet setup
    const possiblePaths = [
      `/service/${encodeURIComponent(address)}`,
      `/proxy/${encodeURIComponent(address)}`,
      `/uv/service/${encodeURIComponent(address)}`,
      `/__uv$${encodeURIComponent(address)}` // Common Ultraviolet pattern
    ];

    let success = false;
    
    for (const path of possiblePaths) {
      try {
        // Test if the path exists by making a fetch request
        const testResponse = await fetch(path, { method: 'HEAD' });
        if (testResponse.ok || testResponse.status !== 404) {
          frame.src = path;
          success = true;
          console.log("Successfully loaded with path:", path);
          break;
        }
      } catch (e) {
        // Continue to next path
        continue;
      }
    }

    if (!success) {
      console.error("All proxy paths failed, trying direct approach");
      // If all paths fail, try the original approach
      frame.src = `/service/${encodeURIComponent(address)}`;
    }

  } catch (error) {
    console.error("Error in proxy navigation:", error);
    // Fallback
    frame.src = `/service/${encodeURIComponent(address)}`;
  }
};

// Also add this improved error handling for the iframe:
useEffect(() => {
  if (isSearching) {
    const frame = document.getElementById("uv-frame");
    
    if (frame) {
      const handleFrameLoad = () => {
        console.log("Frame loaded successfully");
      };
      
      const handleFrameError = () => {
        console.error("Frame failed to load");
        // You could show an error message to the user here
        const errorElement = document.getElementById("uv-error");
        if (errorElement) {
          errorElement.textContent = "Failed to load the requested page. Please try again.";
        }
      };

      frame.addEventListener('load', handleFrameLoad);
      frame.addEventListener('error', handleFrameError);

      return () => {
        frame.removeEventListener('load', handleFrameLoad);
        frame.removeEventListener('error', handleFrameError);
      };
    }
  }
}, [isSearching]);

  // Function to handle search submissions
  const handleSearch = (query) => {
  if (query.trim()) {
    let finalUrl = query.trim();

    // Simple URL detection
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      }
    }

    // Set state and navigate (even if same as before)
    setSearchQuery(query);
    setIsSearching(true);

    // Force navigation to the new query
    handleProxyNavigation(finalUrl);
  }
};

  // Handle form submission for initial search
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const address = document.getElementById("uv-address").value;
    handleSearch(address);
  };

  // Handle persistent search bar submission
  const handlePersistentSearch = (e) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  // Handle Enter key in persistent search input
  const handlePersistentKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/index.js";
    script.defer = true;
    document.body.appendChild(script);

    // Wait for scripts to load before setting up event listeners
    const setupEventListeners = () => {
      const form = document.getElementById("uv-form");
      if (form) {
        // Remove existing listener if any
        form.removeEventListener("submit", handleFormSubmit);
        form.addEventListener("submit", handleFormSubmit);
      }
    };

    // Setup after a short delay to ensure DOM is ready
    setTimeout(setupEventListeners, 100);

    return () => {
      const form = document.getElementById("uv-form");
      if (form) {
        form.removeEventListener("submit", handleFormSubmit);
      }
    };
  }, []);

  return (
    <>
      <Head>
        <title>Ultraviolet | Sophisticated Web Proxy</title>
        <meta name="description" content="Ultraviolet is a highly sophisticated proxy..." />
        <meta name="keywords" content="proxy, ultraviolet, unblock, titanium network" />
        <link rel="icon" href="/favicon.ico" />
        <script src="/baremux/index.js" defer></script>
        <script src="/epoxy/index.js" defer></script>
        <script src="/uv/uv.bundle.js" defer></script>
        <script src="/uv/uv.config.js" defer></script>
        <script src="/register-sw.js" defer></script>
        <script src="/search.js" defer></script>
      </Head>

      <div className={`app-container ${isSearching ? 'searching-mode' : 'home-mode'}`}>
        {/* Home Screen */}
        {!isSearching && (
          <div className="home-screen">
            <div className="logo-wrapper">
              <h1>Ultraviolet | TN</h1>
            </div>

            <div className="description">
              <p>
                Ultraviolet is a highly sophisticated proxy used for evading internet censorship.
              </p>
            </div>

            <form id="uv-form" className="search-form" onSubmit={handleFormSubmit}>
              <input
                id="uv-search-engine"
                type="hidden"
                value="https://www.google.com/search?q=%s"
              />
              <div className="search-container">
                <input 
                  id="uv-address" 
                  type="text" 
                  placeholder="Search the web freely"
                  defaultValue={searchQuery}
                />
                <button type="submit" className="search-button">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="M21 21l-4.35-4.35"></path>
                  </svg>
                </button>
              </div>
            </form>

            <div className="error-container">
              <p id="uv-error"></p>
              <pre id="uv-error-code"></pre>
            </div>

            <footer className="footer">
              <div className="footer-links">
                <a href="https://github.com/titaniumnetwork-dev">TitaniumNetwork</a>
                <a href="https://discord.gg/unblock">Discord</a>
                <a href="https://github.com/tomphttp">TompHTTP</a>
                <a href="https://github.com/titaniumnetwork-dev/Ultraviolet-App">GitHub</a>
                <a href="credits.html">Credits</a>
              </div>
              <div className="footer-copyright">
                <span>Ultraviolet &copy; TN 2023</span>
              </div>
            </footer>
          </div>
        )}

        {/* Search Mode - Persistent Top Bar */}
        {isSearching && (
          <>
            <div className="persistent-search-bar">
              <div className="search-bar-content">
                <button 
                  className="home-button"
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery("");
                  }}
                >
                  <img className="mini-logo" src="/uv.png" alt="UV" />
                </button>
                
                <form className="persistent-search-container" onSubmit={handlePersistentSearch}>
                  <input
                    type="text"
                    placeholder="Search the web freely"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handlePersistentKeyPress}
                    className="persistent-search-input"
                  />
                  <button type="submit" className="persistent-search-button">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                  </button>
                </form>

                <div className="search-controls">
                  <button 
                    className="control-button" 
                    title="Refresh"
                    onClick={() => {
                      const frame = document.getElementById("uv-frame");
                      if (frame && frame.src) {
                        frame.src = frame.src;
                      }
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                    </svg>
                  </button>
                  <button 
                    className="control-button" 
                    title="Fullscreen"
                    onClick={() => {
                      const frame = document.getElementById("uv-frame");
                      if (frame) {
                        if (frame.requestFullscreen) {
                          frame.requestFullscreen();
                        }
                      }
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="frame-container">
              <iframe id="uv-frame" className="proxy-frame"></iframe>
            </div>
          </>
        )}
      </div>
    </>
  );
}