import Head from "next/head";
import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Home() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle the actual proxy navigation
  const handleProxyNavigation = async (address) => {
    console.log("[handleProxyNavigation] Invoked with address:", address);
    setIsLoading(true);

    // Detect mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    console.log("Mobile device detected:", isMobile);

    try {
      // ✅ Always register service worker first and wait until it's ready
      await registerSW();
      await navigator.serviceWorker.ready;
      console.log("✅ Service worker registered and ready");
    } catch (err) {
      console.error("Failed to register service worker:", err);
      toast.error(
        isMobile
          ? "Failed to register service worker. Please try using Safari on iOS or Chrome on Android."
          : "Failed to register service worker."
      );
      setIsLoading(false);
      return;
    }

    // Get the iframe element
    const frame = document.getElementById("uv-frame");
    if (!frame) {
      console.error("Frame not found");
      toast.error("Frame not found. Please refresh the page.");
      setIsLoading(false);
      return;
    }

    try {
      // Initialize BareMux connection
      const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

      // Set up transport
      let wispUrl =
        (location.protocol === "https:" ? "wss" : "ws") +
        "://" +
        location.host +
        "/wisp/";

      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);

      // Extra wait for mobile devices
      if (isMobile) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // ✅ Only set iframe src after SW is fully ready
      const proxiedUrl = __uv$config.prefix + __uv$config.encodeUrl(address);
      frame.src = proxiedUrl;
      console.log("Successfully navigated to:", proxiedUrl);
    } catch (error) {
      console.error("Error in proxy navigation:", error);
      toast.error(
        isMobile
          ? "Failed to connect to proxy. Please check your connection and try again."
          : "Failed to connect to proxy. Please try again."
      );
      setIsLoading(false);
    }
  };

  // Function to handle search submissions
  const handleSearch = async (query) => {
    if (query.trim()) {
      let finalUrl = query.trim();

      if (typeof window !== "undefined" && window.search) {
        finalUrl = window.search(finalUrl, "https://www.google.com/search?q=%s");
      } else {
        if (
          !finalUrl.startsWith("http://") &&
          !finalUrl.startsWith("https://")
        ) {
          if (finalUrl.includes(".") && !finalUrl.includes(" ")) {
            finalUrl = "https://" + finalUrl;
          } else {
            finalUrl = `https://www.google.com/search?q=${encodeURIComponent(
              finalUrl
            )}`;
          }
        }
      }

      setSearchQuery(query);
      setIsSearching(true);

      await handleProxyNavigation(finalUrl);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const address = document.getElementById("uv-address").value;
    await handleSearch(address);
  };

  const handleGoHome = () => {
    setIsSearching(false);
    setSearchQuery("");
    setIsLoading(false);

    const frame = document.getElementById("uv-frame");
    if (frame) {
      frame.src = "about:blank";
    }
  };

  useEffect(() => {
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

    Promise.all([loadScript("/index.js"), loadScript("/search.js")])
      .then(() => {
        console.log("Scripts loaded successfully");
      })
      .catch((err) => {
        console.error("Failed to load scripts:", err);
        toast.error("Failed to load required scripts. Please refresh.");
      });

    return () => {};
  }, []);

  useEffect(() => {
    if (isSearching) {
      const frame = document.getElementById("uv-frame");
      if (frame) {
        const handleFrameLoad = () => {
          console.log("Frame loaded successfully");
          setTimeout(() => {
            setIsLoading(false);
          }, 6000);
        };

        const handleFrameError = () => {
          console.error("Frame failed to load");
          setIsLoading(false);
          toast.error("Failed to load the requested page. Please try again.");
        };

        frame.addEventListener("load", handleFrameLoad);
        frame.addEventListener("error", handleFrameError);

        return () => {
          frame.removeEventListener("load", handleFrameLoad);
          frame.removeEventListener("error", handleFrameError);
        };
      }
    }
  }, [isSearching]);

  return (
    <>
      <Head>
        <title>IncogWay | Sophisticated Web Proxy</title>
        <meta
          name="description"
          content="Incogway is a highly sophisticated proxy..."
        />
        <meta
          name="keywords"
          content="proxy, ultraviolet, IncogWay, titanium network"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, user-scalable=no"
        />
        <link rel="icon" href="/favicon.ico" />

        <script src="/baremux/index.js" defer></script>
        <script src="/epoxy/index.js" defer></script>
        <script src="/uv/uv.bundle.js" defer></script>
        <script src="/uv/uv.config.js" defer></script>
        <script src="/register-sw.js" defer></script>
        <script src="/search.js" defer></script>
      </Head>

      <div
        className={`app-container ${
          isSearching ? "searching-mode" : "home-mode"
        }`}
      >
        {/* Home Screen */}
        {!isSearching && (
          <div className="home-screen">
            <div className="logo-wrapper">
              <h1>IncogWay</h1>
            </div>
            <div className="description">
              <p>
                IncogWay is a highly sophisticated proxy used for evading
                internet censorship.
              </p>
            </div>
            <form
              id="uv-form"
              className="search-form"
              onSubmit={handleFormSubmit}
            >
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
                  style={{ fontSize: "16px" }}
                />
                <button type="submit" className="search-button">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="M21 21l-4.35-4.35"></path>
                  </svg>
                </button>
              </div>
            </form>
            <footer className="footer">
              <div className="footer-copyright">
                <span>IncogWay</span>
              </div>
            </footer>
          </div>
        )}

        {/* Search Mode */}
        {isSearching && (
          <div className="search-mode">
            <div className="back-button-container">
              <button
                className="back-button"
                onClick={handleGoHome}
                title="Go back to home"
              >
                ← Back to Home
              </button>
            </div>
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

      {/* Toast container for notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
}
