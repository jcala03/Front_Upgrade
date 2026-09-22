import "./Marquee.css";

type MarqueeProps = {
  text: string;
};

export const Marquee = ({ text }: MarqueeProps) => {
  const repeatedText = Array.from({ length: 8 }, () => text).join(" · ");

  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        <span>{repeatedText}</span>
        <span>{repeatedText}</span>
      </div>
    </div>
  );
};
