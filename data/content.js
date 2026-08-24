/* All funnel copy and product data lives here.
   Funnel copy gets rewritten constantly — keep it out of the markup. */

/* Hero beats, keyed to the teardown frame sequence.
   `from`/`to` are scroll progress through the pinned hero (0..1).
   The bands are tuned to what the animation actually exposes at that moment:
   beat 4 lands on the bare sensor, beat 5 on the main board. */
const BEATS = [
  {
    id: 'intro',
    from: 0.00, to: 0.22,
    align: 'left',
    eyebrow: 'Canon EOS R5 Mark II',
    title: 'Taken apart,<br>so you can see<br>what you’re buying.',
    body: 'A 45MP stacked sensor, two processors, and 8K60 RAW in a 656 g weather-sealed body. Scroll to strip it down.',
    stats: [
      ['45', 'MP stacked BSI'],
      ['8K', '60p RAW internal'],
      ['30', 'fps blackout-free'],
    ],
    cta: { label: 'See the price', href: '#offer' },
    scrollHint: true,
  },
  {
    id: 'optics',
    from: 0.22, to: 0.41,
    align: 'left',
    eyebrow: '01 — The front end',
    title: 'The RF mount,<br>opened up.',
    body: 'A 20 mm flange distance and a 12-pin connection. The short register is what lets RF optics be designed without compromise, and the wide bus is what lets glass and body talk fast enough to act as one instrument.',
    stats: [
      ['20', 'mm flange distance'],
      ['12', 'pin connection'],
    ],
  },
  {
    id: 'inside',
    from: 0.41, to: 0.575,
    align: 'center',
    eyebrow: '02 — Under the shell',
    title: 'Every gram is<br>doing a job.',
    body: 'Magnesium alloy chassis, sealed seams, and a redesigned heat path — the reason this one keeps rolling where the original R5 tapped out.',
  },
  {
    id: 'stabiliser',
    from: 0.575, to: 0.72,
    align: 'left',
    eyebrow: '03 — The stabiliser',
    title: 'The sensor floats<br>on its own cradle.',
    body: 'That assembly is not bolted down. It rides a five-axis stabiliser that counter-moves against your hands, and when it coordinates with an RF lens’s own IS the pair are good for 8.5 stops. Handheld at half a second, sharp.',
    stats: [
      ['8.5', 'stops IBIS + IS'],
      ['5', 'axis sensor-shift'],
    ],
  },
  {
    id: 'brain',
    from: 0.72, to: 0.885,
    align: 'left',
    eyebrow: '04 — The processing',
    title: 'Two chips,<br>one of them new.',
    body: 'DIGIC X handles the image. A second DIGIC Accelerator runs the deep-learning workload — which is what makes Eye Control AF and Action Priority possible in the first place. Look where you want focus; it goes there.',
    stats: [
      ['5,850', 'AF points'],
      ['100%', 'frame coverage'],
      ['Eye', 'Control AF'],
    ],
  },
  {
    id: 'built',
    from: 0.885, to: 1.0,
    align: 'left',
    eyebrow: '05 — All of it',
    title: 'Nothing in here<br>is filler.',
    body: 'A 5.76M-dot viewfinder running at 120 fps, a 3.2-inch vari-angle screen, dual CFexpress and SD slots, and full weather sealing — at 656 g body-only.',
    stats: [
      ['5.76M', 'dot EVF @120fps'],
      ['656', 'g body only'],
      ['2', 'card slots'],
    ],
    cta: { label: 'See the price', href: '#offer' },
  },
];

/* Mid-page dive: a single continuous push-in from the front-on hero, through
   21 elements of glass, past the nine-blade iris, landing on the bare sensor.
   This section owns the sensor argument — the teardown deliberately does not
   repeat it, because here the sensor is the entire frame.
   Copy sits in a bottom band: this imagery is radially symmetric and fills the
   whole frame, so there is no empty corner to put a column in. */
const LENS_BEATS = [
  {
    id: 'follow',
    from: 0.00, to: 0.20,
    align: 'left',
    eyebrow: 'The light path',
    title: 'Follow the light<br>all the way in.',
    body: 'Every photograph is a negotiation between glass and silicon. Here is the whole journey, from the front element to the thing that finally records it.',
    scrollHint: 'Scroll to travel inward',
  },
  {
    id: 'glass',
    from: 0.20, to: 0.48,
    align: 'left',
    eyebrow: '01 — The glass',
    title: 'Twenty-one elements,<br>fifteen groups.',
    body: 'Three ultra-low dispersion and three aspherical elements pull the colours back into register before they ever reach the sensor. Fluorine coating on the front and rear surfaces sheds water and fingerprints.',
    stats: [
      ['21', 'elements'],
      ['15', 'groups'],
      ['82', 'mm filter thread'],
    ],
  },
  {
    id: 'iris',
    from: 0.48, to: 0.76,
    align: 'left',
    eyebrow: '02 — The aperture',
    title: 'Nine blades,<br>held wide open.',
    body: 'A rounded nine-blade diaphragm keeps out-of-focus highlights circular instead of polygonal. And f/2.8 holds from 24 mm all the way to 70 mm, so your exposure does not shift when you reframe.',
    stats: [
      ['f/2.8', 'constant'],
      ['9', 'rounded blades'],
      ['24-70', 'mm range'],
    ],
  },
  {
    id: 'silicon',
    from: 0.76, to: 1.0,
    align: 'left',
    eyebrow: '03 — The sensor',
    title: 'And this is<br>where it lands.',
    body: 'Forty-five million pixels on a stacked, back-illuminated sensor. Stacking the readout circuitry behind the photosites clears the light path and drains the frame far faster — rolling shutter skew falls roughly 60% against the original R5. Propellers stay straight. Strobes stay clean.',
    stats: [
      ['8192', '× 5464 pixels'],
      ['60%', 'less skew vs R5'],
      ['1/32000', 'electronic shutter'],
    ],
    cta: { label: 'See the price', href: '#offer' },
  },
];

/* Three-up benefit cards below the hero */
const BENEFITS = [
  {
    kicker: 'For stills',
    title: '30 frames a second, and you see all of them.',
    body: 'Blackout-free electronic shutter at 30 fps with Pre-Continuous capture — the camera buffers up to 15 frames before you finish pressing the button. The moment you reacted too slowly to is already recorded.',
    facts: ['30 fps electronic', '12 fps mechanical', 'Pre-Continuous shooting'],
  },
  {
    kicker: 'For video',
    title: '8K60 RAW, recorded internally.',
    body: 'Full-width 8K up to 59.94p in RAW, 4K up to 120p, and 4K60 oversampled from the full sensor. Canon Log 2 gives you the latitude to grade it properly instead of rescuing it.',
    facts: ['8K 59.94p RAW', '4K 120p', 'Canon Log 2 + HDR PQ'],
  },
  {
    kicker: 'For speed',
    title: 'Focus that knows what a sport looks like.',
    body: 'Action Priority modes trained on football, basketball and volleyball pick the player who matters. Register a face and Person Priority holds it through a crowd.',
    facts: ['Dual Pixel CMOS AF II', 'Action Priority', 'Registered People Priority'],
  },
];

/* Use-case section. Quotes are placeholders — no invented customer reviews. */
const USE_CASES = [
  {
    title: 'Weddings & events',
    body: 'Silent 30 fps through the vows, dual-slot redundancy for the files you cannot reshoot, and clean high-ISO for receptions lit by a single bulb.',
    quote: '[PLACEHOLDER — replace with a real, permissioned testimonial before publishing.]',
    attrib: '[Name, role]',
  },
  {
    title: 'Wildlife & sport',
    body: 'Pre-Continuous capture for the takeoff you cannot anticipate, 5,850 AF points across the whole frame, and 45MP of room to crop hard.',
    quote: '[PLACEHOLDER — replace with a real, permissioned testimonial before publishing.]',
    attrib: '[Name, role]',
  },
  {
    title: 'Commercial & film',
    body: '8K60 RAW internal, timecode support, and Canon Log 2 that cuts against cinema bodies. A B-cam that does not look like a B-cam.',
    quote: '[PLACEHOLDER — replace with a real, permissioned testimonial before publishing.]',
    attrib: '[Name, role]',
  },
];

/* Drag-to-rotate viewer, placed just before the price.
   The orbit runs front to back and ends on the controls, so this section is
   about handling and connectivity — the third distinct argument, after the
   teardown's breadth and the dive's depth. */
const ROTATE = {
  kicker: 'Handle it',
  title: 'Look it over<br>yourself.',
  lede: 'The orbit runs from the front element round to the controls. Drag it, or use the arrow keys, and stop wherever you want a closer look.',
  hint: 'Drag to rotate',
  facts: [
    ['Vari-angle screen', '3.2-inch, 2.1M dots, flips fully forward for pieces to camera.'],
    ['Two card slots', 'CFexpress Type B for 8K RAW, SD UHS-II alongside it for redundancy.'],
    ['Ports under the door', 'USB-C, full-size HDMI, mic, headphones and timecode.'],
    ['Weather sealed', 'Magnesium alloy shell with sealed seams at every opening.'],
  ],
};

/* The upgrade lever: why move off an original R5 */
const COMPARISON = {
  columns: ['', 'EOS R5 (2020)', 'EOS R5 Mark II'],
  rows: [
    ['Sensor', '45MP CMOS', '45MP stacked, back-illuminated'],
    ['Processing', 'DIGIC X', 'DIGIC X + DIGIC Accelerator'],
    ['Electronic burst', '20 fps', '30 fps, blackout-free'],
    ['Pre-capture', 'Not available', 'Pre-Continuous, up to 15 frames'],
    ['Rolling shutter', 'Baseline', '~60% less skew'],
    ['Max video', '8K 29.97p', '8K 59.94p RAW'],
    ['High frame rate', '4K 120p (cropped workflow)', '4K 120p with sound'],
    ['Eye Control AF', 'Not available', 'Yes'],
    ['Subject detection', 'Face / animal / vehicle', 'Deep-learning, Action Priority'],
    ['Stabilisation', 'Up to 8 stops', 'Up to 8.5 stops'],
    ['Viewfinder', '5.76M dots, 120 fps', '5.76M dots, 120 fps, brighter panel'],
    ['Thermal behaviour', 'Known 8K limits', 'Redesigned heat path, optional cooling grip'],
  ],
  highlightCol: 2,
};

/* Full spec sheet, grouped. First group starts open. */
const SPECS = [
  ['Sensor & image', [
    ['Sensor', '36 × 24 mm stacked back-illuminated CMOS'],
    ['Effective pixels', '45.0 megapixels (8192 × 5464)'],
    ['Processor', 'DIGIC X with DIGIC Accelerator'],
    ['ISO (stills)', '100–51,200, expandable to 50–102,400'],
    ['In-camera tools', 'Neural network upscaling and noise reduction'],
  ]],
  ['Autofocus', [
    ['System', 'Dual Pixel CMOS AF II'],
    ['Coverage', '100% of the frame'],
    ['Selectable points', '5,850 for stills'],
    ['Subject detection', 'People, animals, vehicles; Action Priority for team sport'],
    ['Eye Control AF', 'Yes, with improved calibration'],
  ]],
  ['Shooting speed', [
    ['Electronic shutter', 'Up to 30 fps, blackout-free'],
    ['Mechanical shutter', 'Up to 12 fps'],
    ['Pre-Continuous', 'Up to 15 frames buffered before full press'],
    ['Shutter range', '30s–1/8000s mechanical; 30s–1/32000s electronic'],
  ]],
  ['Video', [
    ['8K', 'Up to 59.94p, RAW internal'],
    ['4K', 'Up to 119.88p; 4K60 oversampled, SRAW available'],
    ['Colour', 'Canon Log 2, Canon Log 3, HDR PQ'],
    ['Depth', '10-bit 4:2:2 internal'],
  ]],
  ['Stabilisation & build', [
    ['IBIS', '5-axis, up to 8.5 stops with coordinated IS'],
    ['Body', 'Magnesium alloy, weather-sealed'],
    ['Dimensions', '138.4 × 98.4 × 88.4 mm'],
    ['Weight', '656 g body only; 746 g with battery and card'],
  ]],
  ['Viewfinder & screen', [
    ['EVF', '0.5-inch OLED, 5.76M dots, 120 fps, 0.76×'],
    ['Monitor', '3.2-inch vari-angle touchscreen, 2.1M dots'],
  ]],
  ['Storage & power', [
    ['Card slots', 'CFexpress Type B + SDXC UHS-II'],
    ['Battery', 'LP-E6P (LP-E6NH / LP-E6N compatible)'],
    ['Battery life', 'Approx. 630 shots via LCD, 340 via EVF'],
    ['Connectivity', 'Wi-Fi, Bluetooth, USB-C, HDMI, timecode'],
  ]],
];

/* Objection handling */
const FAQS = [
  {
    q: 'Does it still overheat like the original R5?',
    a: 'Not in the same way. The heat path was redesigned around the stacked sensor and the recording limits are substantially longer, particularly in 4K. Sustained 8K in a hot room is still demanding — if that is your daily workload, the optional cooling grip is the honest answer rather than a nice-to-have.',
  },
  {
    q: 'I already own an R5. Is this actually worth the upgrade?',
    a: 'It depends entirely on whether you shoot motion. If you do — sport, wildlife, events, anything fast — the stacked sensor, 30 fps, Pre-Continuous capture and the new AF are a genuine generational jump. If you mostly shoot landscapes, portraits or studio work at base ISO, your existing R5 produces very similar files and the upgrade is difficult to justify.',
  },
  {
    q: 'Do I have to buy CFexpress cards?',
    a: 'For 8K RAW and the fastest burst depths, yes — budget for a CFexpress Type B card on top of the body. For 4K and normal stills work the SD UHS-II slot is fine. Worth pricing in before you commit, because it is a real added cost people forget.',
  },
  {
    q: 'Will my existing EF lenses work?',
    a: 'Yes, through a Canon EF-EOS R adapter, with full autofocus and stabilisation. You lose nothing optically. Native RF glass is what unlocks the full 8.5 stops of coordinated stabilisation.',
  },
  {
    q: 'How does it compare to a Sony a1 II or Nikon Z8?',
    a: 'All three are excellent and the sensible deciding factor is usually glass and ergonomics rather than the spec sheet. The R5 Mark II’s distinctive advantages are Eye Control AF and 8K60 RAW internal; if you already own RF lenses the decision largely makes itself.',
  },
  {
    q: 'What is in the box?',
    a: 'Body, LP-E6P battery, charger, strap, and cables. Lenses, cards and the cooling grip are sold separately — configure them in the section above.',
  },
];

/* Commerce */
const OFFER = {
  primary: {
    name: 'EOS R5 Mark II — Body only',
    price: '$4,299',
    note: 'For photographers who already own RF glass.',
    includes: ['Body, battery, charger, strap', '1-year limited warranty', 'Free 2-day shipping'],
  },
  bundle: {
    name: 'EOS R5 Mark II + RF 24-105mm f/4L IS USM',
    price: '$5,399',
    note: 'Saves $400 against buying the lens separately.',
    badge: 'Most popular',
    includes: ['Everything in body only', 'RF 24-105mm f/4L IS USM', 'Free 2-day shipping'],
  },
  reassurance: [
    ['30-day returns', 'Shoot a full job with it. Send it back if it is not right.'],
    ['1-year warranty', 'Canon limited warranty, extendable at checkout.'],
    ['In stock', 'Ships next business day.'],
  ],
};

window.FUNNEL = {
  BEATS, LENS_BEATS, ROTATE, BENEFITS, USE_CASES, COMPARISON, SPECS, FAQS, OFFER,
};
