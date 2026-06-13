# Ousmane Dembélé - Interactive 3D Particle Globe

This repository contains a high-fidelity interactive 3D particle globe representing a golden ball (Ballon d'Or), created using WebGL, Three.js, and GSAP. 

## Features
- **InstancedMesh Particles**: Handles 10,000 particles efficiently with a single draw call.
- **Interactive Repulsion**: Particles react to the user's mouse cursor, creating a highly engaging, physical deformation effect.
- **Scroll-to-Explode Animation**: The user can scroll the page or use the control panel to organically explode the particles outward.
- **Premium Glassmorphic UI**: High-end overlay panels displaying GPU/WebGL metrics and exposing physical parameters (repulsion radius, explosion state).
- **Smooth Animations**: Powered by GSAP and custom Math.lerp logic for organic interpolations, smooth rotations, and particle transitions.

## Technologies Used
- HTML5 & CSS3
- JavaScript (ES6+)
- [Three.js](https://threejs.org/) (WebGL rendering)
- [GSAP](https://greensock.com/gsap/) (Animations)

## Getting Started
Simply open the `index.html` file in any modern web browser to view the interactive globe. No build tools are required.

## Interactions
- **Hover/Move Cursor**: Push the particles away from the cursor.
- **Drag**: Rotate the globe manually.
- **Scroll**: Trigger the explosion effect.
- **Controls Panel**: Toggle auto-rotation, explosion states, and tweak the repulsion radius.
