import Head from "next/head";
import { useEffect, useState } from "react";

export default function Home() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle the actual proxy navigation
  const handleProxyNavigation = async (address) => {
    console.log("[handleProxyNavigation] Invoked with address:", address);

    setIsLoading(true);

    try {
      // Register service worker first
      await registerSW();
    } catch (err) {
      console.error("Failed to register service worker:", err);
      const errorElement = document.getElementById("uv-error");
      if (errorElement) {
        errorElement.textContent = "Failed to register service worker.";
      }
      setIsLoading(false);
      return;
    }

    // Get the iframe element
    const frame = document.getElementById("uv-frame");
    if (!frame) {
      console.error("Frame not found");
      setIsLoading(false);
      return;
    }

    try {
      // Initialize BareMux connection
      const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
      
      // Set up transport
      let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
      
      // Always set the transport to ensure it's properly configured
      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
      
      // Wait a moment for the connection to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to the proxied URL
      const proxiedUrl = __uv$config.prefix + __uv$config.encodeUrl(address);
      frame.src = proxiedUrl;
      
      console.log("Successfully navigated to:", proxiedUrl);

    } catch (error) {
      console.error("Error in proxy navigation:", error);
      const errorElement = document.getElementById("uv-error");
      if (errorElement) {
        errorElement.textContent = "Failed to connect to proxy. Please try again.";
      }
      setIsLoading(false);
    }
  };

  // Function to handle search submissions
  const handleSearch = async (query) => {
    if (query.trim()) {
      let finalUrl = query.trim();

      // Simple URL detection using the search function from search.js
      if (typeof window !== 'undefined' && window.search) {
        finalUrl = window.search(finalUrl, "https://www.google.com/search?q=%s");
      } else {
        // Fallback URL processing
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
            finalUrl = 'https://' + finalUrl;
          } else {
            finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
          }
        }
      }

      // Set state and navigate
      setSearchQuery(query);
      setIsSearching(true);

      // Navigate to the new query
      await handleProxyNavigation(finalUrl);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const address = document.getElementById("uv-address").value;
    await handleSearch(address);
  };

  // Handle going back to home
  const handleGoHome = () => {
    setIsSearching(false);
    setSearchQuery("");
    setIsLoading(false);
    
    // Clear the iframe
    const frame = document.getElementById("uv-frame");
    if (frame) {
      frame.src = "about:blank";
    }
    
    // Clear any error messages
    const errorElement = document.getElementById("uv-error");
    if (errorElement) {
      errorElement.textContent = "";
    }
  };

  useEffect(() => {
    // Load external scripts
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        
        const script = document.createElement("script");
        script.src = src;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    // Load required scripts
    Promise.all([
      loadScript("/index.js"),
      loadScript("/search.js")
    ]).then(() => {
      console.log("Scripts loaded successfully");
    }).catch(err => {
      console.error("Failed to load scripts:", err);
    });

    // Cleanup function
    return () => {
      // Clean up any resources if needed
    };
  }, []);

  // Add iframe error handling
  useEffect(() => {
    if (isSearching) {
      const frame = document.getElementById("uv-frame");
      
      if (frame) {
        const handleFrameLoad = () => {
          console.log("Frame loaded successfully");
          setIsLoading(false); // Hide loader when frame loads
          // Clear any previous error messages
          const errorElement = document.getElementById("uv-error");
          if (errorElement) {
            errorElement.textContent = "";
          }
        };
        
        const handleFrameError = () => {
          console.error("Frame failed to load");
          setIsLoading(false); // Hide loader on error
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

  return (
    <>
      <Head>
        <title>IncogWay | Sophisticated Web Proxy</title>
        <meta name="description" content="Incogway is a highly sophisticated proxy..." />
        <meta name="keywords" content="proxy, ultraviolet, IncogWay, titanium network" />
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
              <h1>IncogWay</h1>
            </div>

            <div className="description">
              <p>
                IncogWay is a highly sophisticated proxy used for evading internet censorship.
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
                  defaultValue=""
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
              {/* <div className="footer-links">
                <a href="https://github.com/titaniumnetwork-dev">TitaniumNetwork</a>
                <a href="https://discord.gg/unblock">Discord</a>
                <a href="https://github.com/tomphttp">TompHTTP</a>
                <a href="https://github.com/titaniumnetwork-dev/Ultraviolet-App">GitHub</a>
                <a href="credits.html">Credits</a>
              </div> */}
              <div className="footer-copyright">
                <span>IncogWay</span>
              </div>
            </footer>
          </div>
        )}

        {/* Search Mode - Full Screen iframe with simple back button */}
        {isSearching && (
          <div className="search-mode">
            {/* Simple back button */}
            <div className="back-button-container">
              <button 
                className="back-button"
                onClick={handleGoHome}
                title="Go back to home"
              >
                ← Back to Home
              </button>
            </div>
            
            {/* Full screen iframe with loader */}
            <div className="frame-container">
              {isLoading && (
                <div className="loader-container">
                  <div className="loader">
                    <div className="loader-spinner"></div>
                    <div className="loader-text">Loading your page...</div>
                  </div>
                </div>
              )}
              <iframe id="uv-frame" className="proxy-frame"></iframe>
            </div>
          </div>
        )}
      </div>
    </>
  );
}