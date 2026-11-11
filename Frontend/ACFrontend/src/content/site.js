// Content for the public website: company details, services, projects, FAQs…
// Company details come from .env (copied from the backend's COMPANY_* values).
// Edit the figures, testimonials and projects below to match real records.

const env = import.meta.env;

export const COMPANY_INFO = {
  name: env.VITE_COMPANY_NAME || "Haycon Solutions Limited",
  email: env.VITE_COMPANY_EMAIL || "haycontech.solutions500@gmail.com",
  phone: env.VITE_COMPANY_PHONE || "+234 702 524 2589",
  address: env.VITE_COMPANY_ADDRESS || "Lagos, Nigeria",
  hours: env.VITE_COMPANY_HOURS || "Mon – Sat, 8:00am – 6:00pm",
};
export const PHONE_HREF = `tel:${COMPANY_INFO.phone.replace(/[^\d+]/g, "")}`;
export const WHATSAPP_HREF = `https://wa.me/${COMPANY_INFO.phone.replace(/\D/g, "")}`;
export const MAIL_HREF = `mailto:${COMPANY_INFO.email}`;

export const BRANDS = ["LG", "Samsung", "Daikin", "Panasonic", "Hisense", "Midea", "Gree", "Carrier"];

// Keys match the backend's service types, so "Book" links pre-fill the form.
export const SERVICES = {
  installation: {
    slug: "installation",
    title: "Installation",
    icon: "install",
    image: "/images/installer.jpg",
    imageAlt: "Technician in a hard hat drilling a wall to mount equipment",
    summary: "Split, standing, cassette and ducted units sized for the room, fitted neatly and tested before we leave.",
    intro:
      "A good air conditioner badly installed will cost you in power bills and repairs. We size the unit to the space, pick the right spot for the indoor and outdoor units, and install to the manufacturer's standard so your warranty stays valid.",
    points: [
      "Free site survey and load sizing for every room",
      "Neat copper piping, insulation and drainage runs",
      "Wall, ceiling and rooftop mounting with proper brackets",
      "Vacuuming, pressure testing and gas charging",
      "Electrical connection with dedicated breaker and stabiliser advice",
      "Handover: we show you how to use and care for the unit",
    ],
    steps: [
      ["Site survey", "We visit, measure the space and recommend the right capacity and position."],
      ["Quote & schedule", "You receive a clear quote and pick an installation date that suits you."],
      ["Installation", "Our team mounts, pipes, wires and tests the system, then cleans up."],
      ["Sign-off", "You sign the service report on site and receive a copy by email."],
    ],
  },
  repair: {
    slug: "repair",
    title: "Repair",
    icon: "repair",
    image: "/images/field-engineer.jpg",
    imageAlt: "Field engineer in a yellow hard hat working on wall connections",
    summary: "Not cooling, leaking water, noisy or tripping? We find the fault and fix it, usually on the first visit.",
    intro:
      "When your AC stops working in Lagos heat, you need it back fast. Our technicians carry common parts and diagnostic tools so most faults are fixed on the first visit, and you approve the cost before any work starts.",
    points: [
      "Units not cooling or blowing warm air",
      "Water leaking from the indoor unit",
      "Gas (refrigerant) leaks: detection, repair and refill",
      "Compressor, fan motor and capacitor faults",
      "PCB, sensor and remote-control problems",
      "Strange noises, bad smells and frequent tripping",
    ],
    steps: [
      ["Tell us the problem", "Book online or call. Describe what the unit is doing."],
      ["Diagnosis", "A technician visits, tests the system and explains the fault."],
      ["Approved fix", "You approve the quote, then we repair with genuine parts."],
      ["Test & report", "We test the cooling and give you a signed service report."],
    ],
  },
  maintenance: {
    slug: "maintenance",
    title: "Maintenance",
    icon: "maintenance",
    image: "/images/ac-wall-units.jpg",
    imageAlt: "Row of air-conditioning units mounted on a wall",
    summary: "Scheduled cleaning and servicing that keeps units efficient, healthy and lasting longer.",
    intro:
      "Dust, humidity and power surges wear air conditioners down quickly. Regular servicing keeps cooling strong, lowers your electricity bill and catches small problems before they turn into expensive repairs.",
    points: [
      "Washing of filters, coils and indoor unit blower",
      "Outdoor condenser cleaning and fan check",
      "Gas pressure and temperature checks",
      "Drain line flushing to prevent leaks",
      "Electrical terminal tightening and safety checks",
      "Maintenance plans for homes, offices and estates",
    ],
    steps: [
      ["Choose a plan", "One-off service or a quarterly plan for your home or business."],
      ["Scheduled visit", "We remind you and arrive at the agreed time."],
      ["Full service", "Cleaning, checks and minor adjustments on every unit."],
      ["Health report", "You get a signed report with the condition of each unit."],
    ],
  },
};
export const SERVICE_LIST = Object.values(SERVICES);

export const REASONS = [
  ["tech", "Trained technicians", "Experienced engineers who work on every major brand and system type."],
  ["clock", "Flexible scheduling", "Morning, afternoon or weekend visits that fit around your day."],
  ["tag", "Transparent pricing", "A clear quote before work starts. No surprise charges."],
  ["shield", "Genuine parts", "Quality parts and materials that last in our climate."],
  ["bolt", "Fast response", "Urgent breakdowns in Lagos are attended to quickly."],
  ["check", "Signed service reports", "Every job ends with a report you sign and receive by email."],
];

// Placeholder figures — replace with your real numbers.
export const STATS = [
  ["500+", "Projects completed"],
  ["98%", "Customer satisfaction"],
  ["10+", "Years of experience"],
  ["24/7", "Support line"],
];

// Placeholder testimonials — replace with real customer feedback.
export const TESTIMONIALS = [
  [
    "Adebayo O.",
    "Homeowner, Lekki",
    "/images/client-1.jpg",
    "They installed three split units in our new flat. Neat piping, no mess, and they explained everything before leaving.",
  ],
  [
    "Chiamaka E.",
    "Office manager, Ikeja",
    "/images/client-2.jpg",
    "Our office ACs are now on a quarterly plan. The team is always on time and the reports make it easy to track each unit.",
  ],
  [
    "Ibrahim S.",
    "Restaurant owner, Yaba",
    "/images/client-3.jpg",
    "Our cold room AC failed on a Friday evening. They came the same night and had it running again before service.",
  ],
  [
    "Funmilayo A.",
    "Homeowner, Surulere",
    "/images/client-4.jpg",
    "Honest diagnosis and a fair price. The unit another company said to replace only needed a new capacitor.",
  ],
];

// Placeholder projects — replace with real jobs and photos.
export const PROJECTS = [
  {
    title: "Residential split-unit installation",
    place: "Lekki, Lagos",
    category: "Residential",
    service: "installation",
    image: "/images/ac-living-room.jpg",
  },
  {
    title: "Office cooling upgrade",
    place: "Victoria Island, Lagos",
    category: "Commercial",
    service: "installation",
    image: "/images/office.jpg",
  },
  {
    title: "Multi-unit maintenance contract",
    place: "Ikeja, Lagos",
    category: "Commercial",
    service: "maintenance",
    image: "/images/ac-wall-units.jpg",
  },
  {
    title: "Rooftop condenser replacement",
    place: "Ikoyi, Lagos",
    category: "Commercial",
    service: "repair",
    image: "/images/ac-outdoor-units.jpg",
  },
  {
    title: "Family home servicing",
    place: "Surulere, Lagos",
    category: "Residential",
    service: "maintenance",
    image: "/images/family.jpg",
  },
  {
    title: "Gas leak repair & refill",
    place: "Yaba, Lagos",
    category: "Residential",
    service: "repair",
    image: "/images/ac-unit.jpg",
  },
  {
    title: "Corporate meeting rooms",
    place: "Lagos Island",
    category: "Commercial",
    service: "installation",
    image: "/images/office-meeting.jpg",
  },
  {
    title: "Site survey for new estate",
    place: "Ajah, Lagos",
    category: "Residential",
    service: "installation",
    image: "/images/engineer-plans.jpg",
  },
];

export const FAQS = [
  [
    "How often should my AC be serviced?",
    "For homes, every 3 to 4 months. Offices, shops and restaurants that run units all day benefit from monthly or quarterly servicing.",
  ],
  [
    "Do you work on all brands?",
    "Yes. We install, repair and service LG, Samsung, Daikin, Panasonic, Hisense, Midea, Gree, Carrier and most other brands.",
  ],
  [
    "How much does a repair cost?",
    "It depends on the fault. A technician diagnoses the unit first and gives you a quote. Nothing is done until you approve it.",
  ],
  [
    "Do you give a warranty on your work?",
    "Yes. Installations and repairs carry a workmanship warranty, and parts carry the manufacturer's warranty.",
  ],
  [
    "How do I get a quote?",
    "Fill in the booking form, call us or send a WhatsApp message. We usually respond within a few hours.",
  ],
];
