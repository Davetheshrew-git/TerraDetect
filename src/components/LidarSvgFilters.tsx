import React from 'react';

export interface LidarLightingProps {
  sunAzimuth: number;     // 0° to 360° compass bearing
  sunAltitude: number;    // 5° low grazing light to 85° zenith
  slrmOpacity: number;    // 0.0 to 1.0 micro-topography residual blend
  slrmRadius?: number;    // 2px to 10px regional trend kernel
  surfaceScale?: number;  // vertical terrain relief factor
}

/**
 * TerraDetect UK — Custom Dual-Pass Archaeological Terrain Shader
 * Combines directional azimuth/zenith relief shading with local trend-surface
 * residual isolation to expose ploughed barrows, Roman agger banks, and medieval ridge-and-furrow.
 */
export const LidarSvgFilters: React.FC<LidarLightingProps> = ({
  sunAzimuth = 315,
  sunAltitude = 35,
  slrmOpacity = 0.6,
  slrmRadius = 4,
  surfaceScale = 2.6
}) => {
  const normalizedBearing = Math.round(((sunAzimuth % 360) + 360) % 360);
  const clampedZenith = Math.max(5, Math.min(85, Math.round(sunAltitude)));
  const residualRatio = Math.max(0, Math.min(1, slrmOpacity));
  const kernelSigma = Math.max(1, Math.min(12, slrmRadius));
  const reliefGain = Math.max(1, Math.min(6, surfaceScale));

  const residualWeight = Number((residualRatio * 1.65).toFixed(3));
  const terrainWeight = Number((1.0 - residualRatio * 0.42).toFixed(3));

  return (
    <svg
      id="terradetect-relief-shader-defs"
      className="fixed w-0 h-0 overflow-hidden pointer-events-none invisible"
      aria-hidden="true"
    >
      <defs>
        <filter
          id="terradetect-relief-engine"
          x="-12%"
          y="-12%"
          width="124%"
          height="124%"
          colorInterpolationFilters="sRGB"
        >
          {/* Pass 1: Directional oblique solar illumination across elevation raster */}
          <feDiffuseLighting
            in="SourceGraphic"
            surfaceScale={reliefGain}
            diffuseConstant={1.42}
            lightingColor="#ffffff"
            result="directionalShade"
          >
            <feDistantLight azimuth={normalizedBearing} elevation={clampedZenith} />
          </feDiffuseLighting>

          {/* Pass 2: Modulate bare-earth raster with oblique illumination */}
          <feBlend
            in="SourceGraphic"
            in2="directionalShade"
            mode="multiply"
            result="shadedElevation"
          />

          {/* Pass 3: Compute regional macro-slope surface via Gaussian smoothing */}
          <feGaussianBlur
            in="shadedElevation"
            stdDeviation={kernelSigma}
            result="regionalSlopeTrend"
          />

          {/* Pass 4: Extract local archaeological micro-relief residual */}
          <feComposite
            in="shadedElevation"
            in2="regionalSlopeTrend"
            operator="arithmetic"
            k1="0"
            k2="1.72"
            k3="-1.32"
            k4="0.24"
            result="microEarthworkResidual"
          />

          {/* Pass 5: Composite micro-relief residual with shaded elevation */}
          <feComposite
            in="microEarthworkResidual"
            in2="shadedElevation"
            operator="arithmetic"
            k1="0"
            k2={residualWeight}
            k3={terrainWeight}
            k4="0"
            result="terradetectCompositeRelief"
          />
        </filter>
      </defs>
    </svg>
  );
};
