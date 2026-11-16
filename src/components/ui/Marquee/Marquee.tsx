import "./Marquee.css";

type MarqueeProps = {
  text: string;
};

export const Marquee = ({ text }: MarqueeProps) => {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        <span data-marquee-text={text} />
        <span data-marquee-text={text} />
      </div>
    </div>
  );
};
