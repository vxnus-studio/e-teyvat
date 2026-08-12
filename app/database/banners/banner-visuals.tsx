import Image from "next/image";

const localCharacterImages: Record<string, string> = {
  alhaitham: "/characters/alhaitham.png",
  arlecchino: "/characters/arlecchino.png",
  furina: "/characters/furina.png",
  nahida: "/characters/nahida.png",
  neuvillette: "/characters/neuvillette.png",
};

export function CharacterPortrait({
  slug,
  name,
  imageUrl,
  className = "",
  sizes = "180px",
}: {
  slug: string;
  name: string;
  imageUrl?: string | null;
  className?: string;
  sizes?: string;
}) {
  const src = imageUrl || localCharacterImages[slug];

  return (
    <span className={`banner-character-art ${className}`}>
      {src ? (
        <Image src={src} alt={`${name} character artwork`} fill sizes={sizes} />
      ) : (
        <span className="banner-character-fallback" aria-hidden="true">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function SignalGlyph({ value }: { value: number }) {
  return (
    <span className="signal-glyph" aria-hidden="true">
      {[18, 35, 52, 72, 100].map((threshold, index) => (
        <i className={value >= threshold ? "active" : ""} key={threshold} style={{ height: `${7 + index * 3}px` }} />
      ))}
    </span>
  );
}
