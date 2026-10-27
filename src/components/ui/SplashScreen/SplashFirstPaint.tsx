import logo from "../../../assets/logos/upgrade79-logo-hq.png";

// This non-animated SSR cover is outside #root, not a second React splash.
// Its appearance shares the exact asset and critical CSS with SplashScreen.
export const splashLogo = logo;
export const SplashFirstPaint = () => (
  <div id="initial-splash" className="splash splash--initial" aria-hidden="true">
    <div className="splash__backdrop" />
    <div className="splash__logo-wrap">
      <img className="splash__logo" src={logo} alt="" width="1536" height="1024" loading="eager" />
    </div>
  </div>
);
