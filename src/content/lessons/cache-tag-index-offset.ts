import type { Lesson, StateTable } from '../types';

// Reference cache: AMD Zen 4 L1D, 32 KB, 8-way, 64 B lines → 64 sets.
// Address 0x7FFE3A48: offset = 0x48 & 0x3F = 8, index = (0xA48 >> 6) & 63 = 41, tag = 0x7FFE3.

const TAGS = ['0x1A2F0', '0x7FFE2', '0x00401', '0x3C9B7', '0x7FFE4', '0x0A11C', '0x55D20', '0x2B7E8'];
const AGE = [2, 0, 5, 7, 1, 4, 3, 6]; // way 3 is least recently used
const ago = (n: number) => (n === 0 ? 'just now' : `${n} access${n > 1 ? 'es' : ''} ago`);

const setTable = (phase: 'compare' | 'filled' | 'hit'): StateTable => ({
  title: { b: 'Row 41 of the cache (8 slots)', i: 'Set 41 · 8 ways · LRU' },
  columns: ['Way', 'Valid', 'Tag', 'Last used', 'Status'],
  rows: TAGS.map((t, w) => {
    if (phase === 'compare') return { cells: [String(w), '1', t, ago(AGE[w]), '✕ tag ≠ 0x7FFE3'], tone: 'err' as const };
    if (w === 3) return { cells: ['3', '1', '0x7FFE3', phase === 'hit' ? 'just now' : 'just now', phase === 'hit' ? '✓ HIT' : '✓ new line (way 3 was oldest)'], tone: 'mem' as const };
    return { cells: [String(w), '1', t, ago(AGE[w] + (phase === 'hit' ? 2 : 1)), '—'] };
  }),
});

export const cacheTagIndexOffset: Lesson = {
  id: 'm-cache',
  world: 'cpu',
  components: ['cpu.l1d', 'cpu.lsu', 'cpu.l1i'],
  level: 'beginner',
  minutes: 6,
  status: 'ready',
  title: { b: 'Where does a byte live?', i: 'Caches: lines, sets, ways, tag/index/offset' },
  teaser: { b: 'How the core finds one byte among 32,768, in about 4 ticks.', i: 'Address split, set selection, tag compare, LRU fill, AMAT.' },
  body: {
    scene: {
      viewBox: [760, 440],
      viewBoxN: [380, 660],
      nodes: [
        { type: 'label', id: 'addrL', x: 20, y: 36, text: { b: 'Address: 0x7FFE3A48', i: 'addr = 0x7FFE3A48' }, kind: 'mem', mono: true, size: 13, n: { x: 16, y: 24 } },
        { type: 'label', id: 'segTag', x: 20, y: 64, text: { b: 'Label (tag): 0x7FFE3', i: 'tag    = addr>>12 = 0x7FFE3' }, kind: 'mem', mono: true, initial: 'hidden', n: { x: 16, y: 46 } },
        { type: 'label', id: 'segIdx', x: 20, y: 86, text: { b: 'Row (index): 41', i: 'index  = (addr>>6)&63 = 41' }, kind: 'math', mono: true, initial: 'hidden', n: { x: 16, y: 66 } },
        { type: 'label', id: 'segOff', x: 20, y: 108, text: { b: 'Byte in chunk (offset): 8', i: 'offset = addr&63 = 8' }, kind: 'mem', mono: true, initial: 'hidden', n: { x: 16, y: 86 } },

        { type: 'box', id: 'core', x: 20, y: 150, w: 160, h: 130, kind: 'cpu', title: { b: 'CPU core', i: 'Core' }, sub: { b: 'needs one byte', i: 'load r1, [0x7FFE3A48]' }, n: { x: 16, y: 104, w: 348, h: 86 } },
        { type: 'arrow', id: 'a1', x: 182, y: 215, x2: 216, y2: 215, n: { x: 190, y: 192 }, n2: { x2: 190, y2: 216 } },

        { type: 'box', id: 'l1', x: 222, y: 20, w: 372, h: 330, kind: 'mem', title: { b: 'L1 data cache: the closest shelf', i: 'L1 data cache' }, sub: { b: '32 KB · 8 slots per row', i: '32 KB · 8-way · 64 sets · 64 B lines' }, n: { x: 16, y: 220, w: 348, h: 316 } },
        { type: 'label', id: 'dots1', x: 262, y: 80, text: '⋮', anchor: 'middle', n: { x: 52, y: 288 } },
        {
          type: 'grid', id: 'l1g', x: 232, y: 86, rows: 7, cols: 8, cw: 30, ch: 22, gap: 6, kind: 'mem', rowKind: 'math', labelW: 62,
          rowLabels: ['set 38', 'set 39', 'set 40', 'set 41', 'set 42', 'set 43', 'set 44'],
          colLabels: ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'],
          n: { x: 26, y: 294 }, cwN: 28, chN: 22, gapN: 6, labelWN: 54,
        },
        { type: 'label', id: 'dots2', x: 262, y: 296, text: '⋮', anchor: 'middle', n: { x: 52, y: 500 } },
        { type: 'label', id: 'l1note', x: 238, y: 336, text: { b: 'Each slot holds one 64-byte chunk plus its label.', i: 'Each way: one 64 B line + tag + valid/dirty bits.' }, size: 11, n: { x: 28, y: 526 } },
        { type: 'badge', id: 'miss', x: 486, y: 302, w: 96, text: '✕ MISS', kind: 'err', initial: 'hidden', n: { x: 256, y: 502 } },
        { type: 'badge', id: 'hit', x: 486, y: 302, w: 96, text: '✓ HIT', kind: 'mem', initial: 'hidden', n: { x: 256, y: 502 } },

        { type: 'box', id: 'l2', x: 322, y: 374, w: 196, h: 58, kind: 'mem', title: { b: 'L2: next shelf', i: 'L2 cache' }, sub: { b: 'bigger, a bit slower', i: '1 MB · ~14 cycles (approx.)' }, n: { x: 16, y: 576, w: 168, h: 64 } },
        { type: 'arrow', id: 'a2', x: 420, y: 372, x2: 420, y2: 354, kind: 'mem', n: { x: 100, y: 574 }, n2: { x2: 100, y2: 540 } },
        { type: 'box', id: 'dram', x: 584, y: 374, w: 166, h: 58, kind: 'mem', title: { b: 'Main memory', i: 'DRAM' }, sub: { b: 'huge, far away', i: '~80–100 ns (approx.)' }, n: { x: 196, y: 576, w: 168, h: 64 } },
        { type: 'arrow', id: 'a3', x: 582, y: 403, x2: 522, y2: 403, kind: 'mem', n: { x: 194, y: 608 }, n2: { x2: 186, y2: 608 } },

        { type: 'token', id: 'addrTok', x: 70, y: 244, w: 60, label: 'addr', kind: 'mem', initial: 'hidden', n: { x: 290, y: 160 } },
        { type: 'token', id: 'lineTok', x: 380, y: 393, w: 80, label: '64 B line', kind: 'mem', initial: 'hidden', n: { x: 60, y: 612 } },
      ],
    },
    hook: {
      slot: ['l1', 'l1g', 'dots1', 'dots2', 'l1note'],
      prompt: { b: 'Which part belongs in the empty slot next to the core?', i: 'Which part fills the slot between the core and L2?' },
      options: [
        { label: 'Branch predictor', sub: { b: 'A small table of guesses', i: 'Predicts control flow' }, feedback: { b: '✕ Not this one. A branch predictor guesses which way an "if" will go. It never holds your data.', i: '✕ A branch predictor predicts branch direction and target. Loads never go through it.' } },
        { label: 'L1 data cache', sub: { b: 'A small, fast store of bytes', i: 'Small SRAM next to the core' }, correct: true, feedback: { b: '✓ The L1 data cache: a 32 KB store right beside the core, about 4–5 ticks away.', i: '✓ L1D: 32 KB, 8-way, ~4–5 cycles load-to-use (approx.).' } },
        { label: 'HBM stack', sub: { b: 'Stacked memory chips', i: 'High-bandwidth DRAM' }, feedback: { b: '✕ Not this one. HBM is stacked memory beside a GPU. It holds gigabytes, but it’s far too slow to sit here.', i: '✕ HBM is DRAM beside a GPU: huge bandwidth, hundreds of cycles of latency. The core needs something ~100× closer.' } },
      ],
    },
    steps: [
      {
        id: 'why',
        title: { b: 'Why keep a copy close?', i: 'Why caches exist' },
        anchor: 'core',
        say: {
          beginner: 'Your program asks for **one byte**. Main memory has it, but a trip there takes about **80–100 nanoseconds**: hundreds of the core’s ticks. So the core keeps copies of recently used data right beside it. That close store is the **cache**.',
          intermediate: 'A load that goes all the way to DRAM costs ~80–100 ns (approx.): **400–500 cycles at 5 GHz**. The L1 data cache answers in **~4–5 cycles**. So where in its 32 KB could a given address be?',
        },
        deeper: { text: { b: 'Time in ticks = time × ticks per second.', i: 'Latency in cycles = latency × clock frequency. Zen 4’s L1D is 32 KB, 8-way set-associative, with 64 B lines.' }, formula: '\\text{cycles} = t \\times f = 80\\,\\text{ns} \\times 5\\,\\text{GHz} = 400' },
        timeline: [
          { at: 0, caption: { b: 'The core needs one byte.', i: 'Core issues load r1, [0x7FFE3A48].' }, do: [{ t: 'core', s: 'active' }] },
          { at: 1100, caption: { b: 'Main memory has it, but it’s far away.', i: 'DRAM: ~80–100 ns ≈ 400–500 cycles (approx.).' }, do: [{ t: 'dram', s: 'active' }] },
          { at: 2600, caption: { b: 'So the core checks a small, close copy first: the cache.', i: 'L1D first: ~4–5 cycles if the line is present.' }, do: [{ t: 'dram', s: 'idle' }, { t: 'l1', s: 'active' }] },
        ],
      },
      {
        id: 'lines',
        title: { b: 'Data comes in 64-byte chunks', i: 'Lines and the offset' },
        anchor: 'l1',
        say: {
          beginner: 'The cache never stores single bytes. It works in **64-byte chunks** called **lines**, like boxes on a shelf. The last part of the address, called the **offset**, says which byte inside the box you want. Here it’s {mem:byte 8}.',
          intermediate: 'Lines are 64 B, so the low log₂64 = **6 bits** are the offset: `0x48 & 0x3F` = {mem:8}. Fetching a whole line means the next 63 bytes arrive for free. That is spatial locality, and it’s why walking an array in order is fast.',
        },
        deeper: { text: { b: '64 bytes needs 6 bits to count (2⁶ = 64).', i: 'Offset width is log₂ of the line size.' }, formula: '\\text{offset bits} = \\log_2(\\text{line}) = \\log_2 64 = 6' },
        timeline: [
          { at: 0, caption: { b: 'The address is split into parts. First: which byte in the chunk.', i: 'offset = addr & 63 = 8.' }, do: [{ t: 'core', s: 'idle' }, { t: 'addrL', s: 'focus' }, { t: 'segOff', s: 'shown' }] },
          { at: 1500, caption: { b: 'Each slot in the cache holds one whole 64-byte chunk.', i: 'Each way stores one 64 B line.' }, do: [{ t: 'l1g.*', s: 'active', stagger: 6 }] },
          { at: 2800, do: [{ t: 'l1g.*', s: 'idle' }] },
        ],
      },
      {
        id: 'index',
        title: { b: 'The address picks one row', i: 'The index selects a set' },
        anchor: 'l1g:r3',
        say: {
          beginner: 'The cache is arranged in rows called **sets**. The middle part of the address, the **index**, picks exactly one row. Here that’s {math:row 41}. The cache only ever looks in that one row, which is why it’s so quick.',
          intermediate: 'With 32 KB ÷ (8 ways × 64 B) = **64 sets**, the next 6 bits are the index. Here `(0x7FFE3A48 >> 6) & 63` = {math:41}. Only set 41’s 8 ways are searched, all in parallel.',
        },
        deeper: { text: { b: 'Rows = total size ÷ (slots per row × chunk size). Drag the sliders.', i: 'Sets and bit widths follow from size, ways and line size. Drag the sliders.' }, widget: 'cache-sets' },
        timeline: [
          { at: 0, caption: { b: 'The middle part of the address points at row 41.', i: 'index = (addr >> 6) & 63 = 41 → set 41.' }, do: [{ t: 'segIdx', s: 'shown' }, { t: 'addrTok', s: 'shown' }] },
          { at: 400, do: [{ t: 'addrTok', move: [166, -73], moveN: [-267, 219] }] },
          { at: 1300, caption: { b: 'Only the 8 slots in row 41 need checking.', i: 'Only set 41 is read: 8 ways, compared in parallel.' }, do: [{ t: 'l1g:r3', s: 'active' }, { t: 'addrTok', s: 'hidden' }] },
        ],
      },
      {
        id: 'tag',
        title: { b: 'Is it really ours? The tag', i: 'Tag compare: hit or miss' },
        anchor: 'l1g:r3',
        say: {
          beginner: 'Many addresses share row 41, so each slot carries a label: the **tag**. The cache compares our tag with all 8 labels at once. None match. That’s a {err:miss}, and the core has to wait.',
          intermediate: 'Tag = `addr >> 12` = {mem:0x7FFE3} (20 bits of a 32-bit address; 36 bits for a 48-bit virtual address). The 8 stored tags are compared in parallel. No match → {err:MISS}. The load now waits on L2 (~14 cycles, approx.).',
        },
        timeline: [
          { at: 0, caption: { b: 'Checking our label against all 8 slots…', i: 'Comparing tag 0x7FFE3 against 8 ways…' }, do: [{ t: 'segTag', s: 'shown' }, { t: 'l1g:r3', s: 'active' }] },
          { at: 500, do: [{ t: 'l1g.3.*', s: 'miss', stagger: 90 }] },
          { at: 1500, caption: { b: 'Not in the cache, so the core has to wait.', i: 'MISS: tag 0x7FFE3 isn’t in any of set 41’s 8 ways, so the load waits ~14 cycles for L2.' }, do: [{ t: 'miss', s: 'shown' }, { t: 'core', s: 'miss' }] },
        ],
        table: setTable('compare'),
      },
      {
        id: 'fill',
        title: { b: 'Fetch the chunk, throw out the oldest', i: 'Miss handling and LRU replacement' },
        anchor: 'l2',
        say: {
          beginner: 'The cache asks the next, bigger store (L2) for the whole 64-byte chunk. To make room, it throws out whatever in row 41 was used **longest ago**. Then the chunk goes in, and the core finally gets its byte.',
          intermediate: 'L2 returns the 64 B line. Set 41 is full, so the replacement policy picks a victim: with **LRU** it’s way 3 (least recently used). If the victim were dirty it would be written back first. The new line is installed with tag 0x7FFE3.',
        },
        timeline: [
          { at: 0, caption: { b: 'Asking L2 for the whole chunk.', i: 'Miss → request line from L2.' }, do: [{ t: 'miss', s: 'hidden' }, { t: 'l1g.3.*', s: 'idle' }, { t: 'l2', s: 'active' }, { t: 'lineTok', s: 'shown' }] },
          { at: 900, caption: { b: 'Slot 3 was used longest ago, so it gets thrown out.', i: 'Victim: way 3 (LRU, age 7).' }, do: [{ t: 'l1g.3.3', s: 'miss' }, { t: 'lineTok', move: [-3, -222], moveN: [96, -233] }] },
          { at: 2000, caption: { b: 'The new chunk goes into slot 3. The core gets its byte.', i: 'Line installed in way 3, tag 0x7FFE3; load completes.' }, do: [{ t: 'l1g.3.3', s: 'new' }, { t: 'lineTok', s: 'hidden' }, { t: 'l2', s: 'idle' }, { t: 'core', s: 'active' }] },
        ],
        table: setTable('filled'),
      },
      {
        id: 'amat',
        title: { b: 'Why it pays off', i: 'Average memory access time' },
        anchor: 'l1',
        say: {
          beginner: 'Next time the core asks for a nearby byte, it’s already there: a {mem:hit}, about 4–5 ticks. A miss costs far more. What matters is **how often** you miss. That’s why programs that walk memory in order run so much faster.',
          intermediate: '**AMAT = hit time + miss rate × miss penalty.** With a 4-cycle hit, 5% misses and a 14-cycle L2: 4 + 0.05 × 14 = **4.7 cycles**. For more levels, L1’s miss penalty is L2’s own AMAT. Drag the sliders.',
        },
        deeper: { text: { b: 'Average time = fast time + (how often you miss) × (extra time per miss).', i: 'Two-level AMAT. Rates are local miss rates (approx. inputs).' }, widget: 'amat' },
        timeline: [
          { at: 0, caption: { b: 'Next, the core asks for byte 12 of the same chunk…', i: 'Next load: 0x7FFE3A4C, same line…' }, do: [{ t: 'core', s: 'idle' }, { t: 'l1g:r3', s: 'active' }] },
          { at: 1100, caption: { b: 'It’s already there: a hit, about 4–5 ticks.', i: 'HIT in set 41, way 3: ~4–5 cycles (approx.).' }, do: [{ t: 'l1g.3.3', s: 'hit' }, { t: 'hit', s: 'shown' }] },
        ],
        table: setTable('hit'),
      },
    ],
    takeaways: [
      { b: 'A cache keeps copies of recently used data right next to the core, so most reads never travel to far-away memory.', i: 'Caches exploit temporal and spatial locality: an L1 hit costs ~4–5 cycles vs ~400 for DRAM (approx.).' },
      { b: 'Data moves in 64-byte chunks called lines.', i: 'Address = tag | index | offset; offset bits = log₂(line), index bits = log₂(sets).' },
      { b: 'The address itself says which row to look in, so the search is tiny.', i: 'sets = size ÷ (ways × line). Zen 4 L1D: 32 KB ÷ (8 × 64 B) = 64 sets.' },
      { b: 'A miss means waiting, and throwing something old out to make room.', i: 'AMAT = hit time + miss rate × miss penalty; LRU picks the victim.' },
    ],
    quiz: [
      {
        q: { b: 'The cache only checks one row for each address. What picks the row?', i: 'Which address bits select the set?' },
        choices: [
          { b: 'The middle part of the address (the index)', i: 'The index bits, between the offset and the tag' },
          { b: 'The first empty row', i: 'Whichever set currently has a free way' },
          { b: 'The last part of the address (the offset)', i: 'The offset bits (low 6 bits)' },
        ],
        answer: 0,
        why: { b: 'The index is part of the address itself, so the cache knows instantly where to look.', i: 'index = (addr >> offset bits) mod sets. That’s what makes a lookup cost “compare 8 tags”, not “search 512 lines”.' },
      },
      {
        q: { b: 'A cache is 32 KB, with 8 slots per row and 64-byte chunks. How many rows does it have?', i: '32 KB, 8-way, 64 B lines: how many sets, and how many index bits?' },
        choices: [{ b: '64 rows', i: '64 sets, 6 index bits' }, { b: '512 rows', i: '512 sets, 9 index bits' }, { b: '8 rows', i: '8 sets, 3 index bits' }],
        answer: 0,
        why: { b: '32,768 bytes ÷ (8 × 64 bytes) = 64 rows.', i: '32,768 ÷ (8 × 64) = 64 sets → log₂ 64 = 6 index bits. (512 is the number of lines.)' },
      },
    ],
  },
};
