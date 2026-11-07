interface BrandLogoProps {
  size?: number;
}

export default function BrandLogo({ size = 44 }: BrandLogoProps) {
  return (
    <img
      src="/brand-logo.png"
      alt="Application logo"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0, objectFit: 'contain', borderRadius: 8 }}
    />
  );
}
