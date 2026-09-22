import { useCallback, useRef, useState } from "react";

export const useSplash = () => {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const isComplete = useRef(false);

  const completeSplash = useCallback(() => {
    if (isComplete.current) {
      return;
    }

    isComplete.current = true;
    setIsSplashVisible(false);
  }, []);

  return { isSplashVisible, completeSplash };
};
