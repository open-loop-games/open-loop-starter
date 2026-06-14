<!--
  CookieGlyph — hand-drawn-feeling SVG cookie disc.

  Replaces the 6em 🍪 emoji that read as placeholder. Stippled rim, warm
  radial fill, six chip impressions with offsets, paper grain via SVG
  turbulence, baked-edge highlight. Accepts a `size` prop (default 200)
  and renders inline so CSS can drive transforms / animations on it.
-->
<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 220 });
</script>

<template>
  <svg
    class="cookie-glyph"
    :width="size"
    :height="size"
    viewBox="0 0 220 220"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <radialGradient
        id="cg-fill"
        cx="40%"
        cy="36%"
        r="68%"
      >
        <stop
          offset="0%"
          stop-color="#f1c684"
        />
        <stop
          offset="38%"
          stop-color="#d29447"
        />
        <stop
          offset="78%"
          stop-color="#a06824"
        />
        <stop
          offset="100%"
          stop-color="#5b3812"
        />
      </radialGradient>

      <radialGradient
        id="cg-shine"
        cx="36%"
        cy="32%"
        r="38%"
      >
        <stop
          offset="0%"
          stop-color="rgba(255, 244, 210, 0.55)"
        />
        <stop
          offset="100%"
          stop-color="rgba(255, 244, 210, 0)"
        />
      </radialGradient>

      <radialGradient
        id="cg-rim"
        cx="50%"
        cy="50%"
        r="50%"
      >
        <stop
          offset="86%"
          stop-color="rgba(60, 30, 10, 0)"
        />
        <stop
          offset="98%"
          stop-color="rgba(60, 30, 10, 0.45)"
        />
      </radialGradient>

      <radialGradient
        id="cg-chip"
        cx="35%"
        cy="32%"
      >
        <stop
          offset="0%"
          stop-color="#5a2c14"
        />
        <stop
          offset="100%"
          stop-color="#1a0a02"
        />
      </radialGradient>

      <filter
        id="cg-rough"
        x="-2%"
        y="-2%"
        width="104%"
        height="104%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="2.6"
          numOctaves="2"
          seed="11"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="2.4"
        />
      </filter>

      <filter
        id="cg-grain"
        x="0"
        y="0"
        width="100%"
        height="100%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="1.2"
          numOctaves="2"
          seed="3"
          result="grain"
        />
        <feColorMatrix
          in="grain"
          values="0 0 0 0 0.18
                  0 0 0 0 0.10
                  0 0 0 0 0.04
                  0 0 0 0.22 0"
        />
      </filter>
    </defs>

    <!-- Plate halo (paper-coloured, slightly oversized) -->
    <circle
      cx="110"
      cy="112"
      r="100"
      fill="rgba(248, 239, 214, 0.55)"
      filter="url(#cg-rough)"
    />

    <!-- Crust + body -->
    <g class="cookie-glyph__body">
      <circle
        cx="110"
        cy="110"
        r="92"
        fill="url(#cg-fill)"
        filter="url(#cg-rough)"
      />
      <circle
        cx="110"
        cy="110"
        r="92"
        fill="url(#cg-shine)"
      />
      <circle
        cx="110"
        cy="110"
        r="92"
        fill="url(#cg-rim)"
      />

      <!-- Bran flecks -->
      <g
        opacity="0.55"
        fill="#5a3018"
      >
        <circle
          cx="68"
          cy="92"
          r="0.9"
        />
        <circle
          cx="146"
          cy="64"
          r="0.7"
        />
        <circle
          cx="78"
          cy="148"
          r="0.8"
        />
        <circle
          cx="160"
          cy="142"
          r="0.6"
        />
        <circle
          cx="116"
          cy="56"
          r="0.7"
        />
        <circle
          cx="44"
          cy="118"
          r="0.6"
        />
        <circle
          cx="178"
          cy="100"
          r="0.7"
        />
        <circle
          cx="98"
          cy="172"
          r="0.6"
        />
      </g>

      <!-- Chocolate chips: irregular cluster, no symmetry -->
      <g class="cookie-glyph__chips">
        <ellipse
          cx="68"
          cy="74"
          rx="13"
          ry="11"
          fill="url(#cg-chip)"
          filter="url(#cg-rough)"
        />
        <ellipse
          cx="68"
          cy="74"
          rx="3.5"
          ry="2.2"
          fill="rgba(255, 220, 180, 0.22)"
        />

        <ellipse
          cx="138"
          cy="82"
          rx="11"
          ry="9"
          fill="url(#cg-chip)"
          filter="url(#cg-rough)"
        />
        <ellipse
          cx="138"
          cy="82"
          rx="2.8"
          ry="1.8"
          fill="rgba(255, 220, 180, 0.20)"
        />

        <ellipse
          cx="96"
          cy="124"
          rx="14"
          ry="12"
          fill="url(#cg-chip)"
          filter="url(#cg-rough)"
        />
        <ellipse
          cx="96"
          cy="124"
          rx="3.6"
          ry="2.4"
          fill="rgba(255, 220, 180, 0.22)"
        />

        <ellipse
          cx="156"
          cy="140"
          rx="10"
          ry="9"
          fill="url(#cg-chip)"
          filter="url(#cg-rough)"
        />
        <ellipse
          cx="156"
          cy="140"
          rx="2.6"
          ry="1.8"
          fill="rgba(255, 220, 180, 0.18)"
        />

        <ellipse
          cx="56"
          cy="148"
          rx="11"
          ry="10"
          fill="url(#cg-chip)"
          filter="url(#cg-rough)"
        />
        <ellipse
          cx="56"
          cy="148"
          rx="2.8"
          ry="2"
          fill="rgba(255, 220, 180, 0.20)"
        />

        <ellipse
          cx="124"
          cy="164"
          rx="9"
          ry="8"
          fill="url(#cg-chip)"
          filter="url(#cg-rough)"
        />
        <ellipse
          cx="124"
          cy="164"
          rx="2.4"
          ry="1.6"
          fill="rgba(255, 220, 180, 0.18)"
        />

        <ellipse
          cx="172"
          cy="100"
          rx="7"
          ry="6"
          fill="url(#cg-chip)"
          filter="url(#cg-rough)"
        />
      </g>

      <!-- Subtle baked-rim overlay -->
      <circle
        cx="110"
        cy="110"
        r="91.5"
        fill="none"
        stroke="rgba(40, 18, 4, 0.32)"
        stroke-width="1.2"
      />

      <!-- Grain wash on top of everything -->
      <circle
        cx="110"
        cy="110"
        r="92"
        fill="white"
        filter="url(#cg-grain)"
        opacity="0.4"
      />
    </g>
  </svg>
</template>

<style scoped>
.cookie-glyph {
  display: block;
  filter: drop-shadow(0 6px 10px rgba(50, 24, 6, 0.32))
    drop-shadow(0 1px 0 rgba(255, 240, 200, 0.4));
  transform-origin: 50% 60%;
  user-select: none;
  pointer-events: none;
}
</style>
