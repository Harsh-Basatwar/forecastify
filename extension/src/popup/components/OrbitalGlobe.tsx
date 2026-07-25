interface OrbitalGlobeProps {
  logoUrl: string;
  size?: number;
}

export default function OrbitalGlobe({ logoUrl, size = 200 }: OrbitalGlobeProps) {
  const scale = size / 200;
  const planets = [
    ['🥛', '🍪', '🧂'],     // ring 1, 2, 3
    ['📦', '🛒'],            // ring 2
    ['🧈', '🍞', '🧃'],     // ring 3
  ];

  return (
    <div
      className="orbital-container"
      style={{ width: size, height: size }}
    >
      {/* Center logo */}
      <div className="orbital-center">
        <img src={logoUrl} alt="Forecastify" />
      </div>

      {/* Ring 1 */}
      <div
        className="orbital-ring orbital-ring-1"
        style={{ width: 120 * scale, height: 120 * scale }}
      >
        <div className="orbital-planet">{planets[0][0]}</div>
      </div>

      {/* Ring 2 */}
      <div
        className="orbital-ring orbital-ring-2"
        style={{ width: 160 * scale, height: 160 * scale }}
      >
        <div className="orbital-planet">{planets[1][0]}</div>
        <div className="orbital-planet">{planets[1][1]}</div>
      </div>

      {/* Ring 3 */}
      <div
        className="orbital-ring orbital-ring-3"
        style={{ width: size, height: size }}
      >
        <div className="orbital-planet">{planets[2][0]}</div>
        <div className="orbital-planet">{planets[2][1]}</div>
        <div className="orbital-planet">{planets[2][2]}</div>
      </div>
    </div>
  );
}
