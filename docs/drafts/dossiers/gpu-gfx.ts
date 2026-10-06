import type { Dossier } from './types';

export const dossier: Dossier = {
  id: 'gpu.gfx',
  title: 'Graphics fixed-function units',
  figure: 'gfx',
  short: true,

  oneLine: {
    text: {
      b: 'Hard-wired drawing hardware: it turns triangles into pixels, reads textures, blends colours and traces rays.',
      i: 'Fixed-function blocks beside the shader cores: rasterisers, texture units, ROPs and ray-tracing units.',
    },
    cue: { parts: ['geometry', 'raster', 'texture', 'rop', 'rt'], mode: 'pipeline' },
  },

  whatItDoes: {
    text: {
      b: 'The shader cores run your program. These units do the fixed, repetitive drawing jobs around them. Each job is always the same, so it is built straight into silicon.',
      i: 'The rasteriser converts triangles into pixel fragments. Texture units compute addresses and filter texels. ROPs depth-test, blend and write pixels. RT units test rays against boxes and triangles.',
    },
    cue: { parts: ['raster', 'texture', 'rop', 'rt'], mode: 'pipeline' },
  },

  whyItMatters: {
    text: {
      b: 'A 4K screen has about 8.3 million pixels. At 60 frames per second that is ~500 million pixels a second, each needing texture reads and a blend.',
      i: '3840 × 2160 ≈ 8.3 M pixels; at 60 fps ≈ 0.5 Gpixel/s before overdraw. A bilinear sample reads 4 texels, so texture [[throughput]] must be several times higher.',
    },
    cue: { parts: ['texture', 'rop'], mode: 'pipeline' },
  },

  howItWorks: [
    {
      title: 'Triangles become pixels',
      text: {
        b: 'Shapes arrive as triangles. The rasteriser works out which screen pixels each triangle covers.',
        i: 'After vertex processing, the rasteriser evaluates edge equations per pixel or tile. It emits fragments with interpolated attributes.',
      },
      cue: { parts: ['geometry', 'raster'], mode: 'pipeline' },
    },
    {
      title: 'Shaders ask for texture samples',
      text: {
        b: 'A small program colours each pixel. When it needs a picture (a texture), the texture unit fetches and smooths it.',
        i: 'Pixel shaders on the [[compute unit|compute-unit]] issue sample instructions. Texture units compute texel addresses, fetch through the texture [[cache]] and filter (bilinear = 4 texels).',
      },
      cue: { parts: ['shader', 'texture'], mode: 'pipeline' },
    },
    {
      title: 'ROPs write the final pixel',
      text: {
        b: 'The finished colour goes to a ROP. It checks what is in front, mixes see-through colours and writes the pixel.',
        i: 'ROPs (render back-ends) do depth/stencil tests, blending and multisample resolve. They write to the framebuffer, often with lossless compression.',
      },
      cue: { parts: ['rop'], mode: 'pipeline' },
    },
    {
      title: 'Ray-tracing units test rays',
      text: {
        b: 'For ray tracing, a special unit checks which boxes and triangles a ray hits. The shader cores then colour the result.',
        i: 'RT units run ray–box tests over a bounding volume hierarchy (BVH) and ray–triangle tests. Shading of hits still runs on the shader cores.',
      },
      cue: { parts: ['rt', 'shader'], mode: 'rt' },
    },
  ],

  analogy: {
    text: 'Like a print shop: designers (shader cores) decide the colours, but stamping machines, cutters and laminators (fixed-function units) do the repetitive steps far faster.',
    limits: 'Real units run in parallel on thousands of pixels at once, and the shaders keep asking them for help mid-job.',
  },

  keyNumbers: [
    { label: 'Texture units per compute unit', value: 'typically 4', scope: 'desktop GPUs, 2020s' },
    { label: 'Ray-tracing units per compute unit', value: 'typically 1 (where present)', scope: 'GPUs with hardware ray tracing, 2018 onward' },
    { label: 'ROPs per GPU', value: '~32 to ~200', scope: 'desktop GPUs, 2020s' },
    { label: 'Texels read per bilinear sample', value: '4 (8 for trilinear)', scope: 'standard texture filtering' },
  ],

  math: {
    intro: {
      b: 'Peak drawing rates are just “how many units × how fast the clock ticks”.',
      i: 'Peak fill and texture rates are unit count × clock. Real rates are lower: memory [[bandwidth]], overdraw and filtering mode all cut in.',
    },
    formulas: [
      { tex: 'R_{\\text{pixel}} = N_{\\text{ROP}} \\times f_{\\text{clk}}', note: 'peak pixel fill rate (pixels/s)' },
      { tex: 'R_{\\text{texel}} = N_{\\text{CU}} \\times N_{\\text{TMU/CU}} \\times f_{\\text{clk}}', note: 'peak bilinear texel rate (texels/s)' },
      { tex: 'P_{\\text{frame}} = W \\times H \\times \\text{fps} \\times \\text{overdraw}', note: 'pixels the ROPs must handle per second' },
    ],
    cue: { parts: ['texture', 'rop'], mode: 'pipeline' },
  },

  tradeoffs: [
    {
      text: {
        b: 'Fixed hardware is much faster and uses less power than doing the same job in a program. But it can only do that one job.',
        i: 'Fixed-function logic beats shader emulation in perf/W and area per operation. It cannot adapt when algorithms change, so vendors keep moving stages into shaders.',
      },
      cue: { parts: ['raster', 'texture', 'rop'], mode: 'pipeline' },
    },
    {
      text: {
        b: 'Every drawing unit takes chip area. AI chips that never draw may cut most of it to fit more maths units.',
        i: 'Datacentre GPUs trade graphics area for matrix units, cache and I/O. Graphics GPUs instead spend area on RT units and ROPs.',
      },
      cue: { parts: ['rt', 'rop'] },
    },
  ],

  misconceptions: [
    {
      myth: 'Modern GPUs do everything in programmable shaders now.',
      reality: 'Shading is programmable, but rasterisation, texture filtering, blending and ray intersection still run on fixed-function units.',
    },
    {
      myth: 'Ray-tracing units do the whole ray-traced image.',
      reality: 'They speed up finding what a ray hits. Shading the hit, and on some designs part of the BVH traversal, still runs on shader cores.',
    },
  ],

  evolution: [
    { year: '1999', event: 'NVIDIA GeForce 256 is marketed as the first “GPU”, moving transform and lighting into hardware.' },
    { year: '2006', event: 'Unified shader GPUs (e.g. NVIDIA G80) replace separate vertex and pixel pipes; texture, raster and ROP units stay fixed-function.' },
    { year: '2018–2020', event: 'Hardware ray tracing arrives: NVIDIA RT cores (Turing, 2018), then AMD Ray Accelerators (RDNA 2, 2020).' },
  ],

  connections: {
    fedBy: ['gpu.cmdproc', 'gpu.cu', 'gpu.l2'],
    feeds: ['gpu.cu', 'gpu.l2', 'gpu.devmem'],
    text: {
      b: 'The command processor starts the drawing work. Shader cores ask the texture and ray units for help and get answers back. ROPs send finished pixels out to memory.',
      i: 'The command processor launches draws; rasterisers spawn pixel work on the compute units. Texture and RT results return to shaders. ROP writes flow through L2 to device memory.',
    },
  },

  twin: {
    comp: 'cpu.fpsimd',
    text: {
      b: 'A CPU has no drawing units. Software renderers on CPUs do the same jobs with vector maths instructions instead, much more slowly.',
      i: 'CPUs lack texture units, rasterisers and ROPs. Software rasterisers emulate them with SIMD (AVX/NEON): general vector lanes doing work a GPU does in dedicated logic.',
    },
  },

  vendorNames: {
    nvidia: 'TMUs, raster engines, ROPs, RT cores',
    amd: 'texture units, rasterisers, render back-ends (ROPs), Ray Accelerators',
    intel: 'samplers, pixel back-ends, Ray Tracing Units',
    apple: 'texture units; hardware ray tracing from M3 / A17 Pro',
  },

  course: {
    definition: 'Graphics fixed-function units are dedicated hardware blocks that perform fixed rendering stages (rasterisation, texture addressing and filtering, raster operations and ray intersection) outside the programmable shader cores.',
    definitionSource: 'Adapted from Akenine-Möller et al., Real-Time Rendering, 4th ed. (2018)',
    worked: {
      q: 'A GPU has 64 compute units, 4 texture units each, and runs at 2.0 GHz. What is its peak bilinear texel rate?',
      steps: [
        'Count texture units: 64 × 4 = 256.',
        'Each unit returns one bilinear-filtered sample per clock at peak.',
        'Rate = 256 × 2.0 × 10⁹ = 512 × 10⁹ samples/s.',
      ],
      answer: '≈ 512 Gtexel/s peak (bilinear).',
    },
    practice: [
      {
        q: 'A GPU has 96 ROPs at 2.5 GHz. A game renders 4K (3840 × 2160) at 120 fps with an overdraw of 3. What fraction of peak fill rate does it use?',
        steps: [
          'Peak fill rate = 96 × 2.5 × 10⁹ = 240 × 10⁹ pixels/s.',
          'Pixels per frame = 3840 × 2160 ≈ 8.29 × 10⁶.',
          'Per second = 8.29 × 10⁶ × 120 × 3 ≈ 2.99 × 10⁹ pixels/s.',
          'Fraction = 2.99 / 240 ≈ 0.012.',
        ],
        answer: 'About 1.2% of peak; fill rate is rarely the bottleneck at this level.',
      },
      {
        q: 'A 1920 × 1080 frame samples one texture per pixel. How many texels are read with bilinear and with trilinear filtering?',
        steps: [
          'Pixels = 1920 × 1080 = 2,073,600.',
          'Bilinear reads 4 texels per sample: 2,073,600 × 4 = 8,294,400.',
          'Trilinear blends two mip levels, 4 texels each: 2,073,600 × 8 = 16,588,800.',
        ],
        answer: '≈ 8.3 M texels (bilinear) and ≈ 16.6 M texels (trilinear).',
      },
    ],
    mistakes: [
      'Treating peak fill or texel rate as achievable; memory bandwidth and caches usually limit it first.',
      'Forgetting that trilinear and anisotropic filtering take more texels (and often more cycles) per sample than bilinear.',
    ],
  },

  realWorld: {
    inChips: {
      b: 'Gaming GPUs carry all of these units. Some AI GPUs keep only a tiny bit of drawing hardware.',
      i: 'Consumer GPUs (NVIDIA Ada, AMD RDNA 3) have texture, raster, ROP and RT units throughout. NVIDIA H100 keeps only limited graphics capability and no RT cores.',
    },
    engineer: {
      b: 'Graphics engineers check which unit is the bottleneck: textures, pixels written or rays.',
      i: 'Profile per-unit throughput: texture-bound, ROP-bound or RT-bound frames need different fixes (smaller formats, less overdraw, simpler BVHs).',
    },
    measure: [
      { tool: 'NVIDIA Nsight Graphics', how: 'GPU Trace shows per-unit throughput (texture, raster, ROP, RT) for a captured frame.' },
      { tool: 'AMD Radeon GPU Profiler', how: 'Shows per-draw timing and hardware counters on RDNA GPUs.' },
    ],
  },

  learnMore: {
    lessons: ['b-side', 'g-sm'],
    sources: [
      { title: 'Akenine-Möller, Haines, Hoffman et al., Real-Time Rendering, 4th ed.', year: 2018 },
      { title: 'NVIDIA Turing GPU Architecture whitepaper', year: 2018 },
      { title: 'NVIDIA H100 Tensor Core GPU Architecture whitepaper', year: 2022 },
    ],
  },

  seeInRealChips: [
    { arch: 'nvidia-ada-4090', text: 'Full graphics GPU: texture units and an RT core in every SM, plus raster engines and ROPs.' },
    { arch: 'amd-rdna3', text: 'Texture units and a Ray Accelerator per compute unit, plus render back-ends.' },
    { arch: 'hopper-h100', text: 'A datacentre GPU: only limited graphics capability remains and there are no RT cores.' },
  ],
};
