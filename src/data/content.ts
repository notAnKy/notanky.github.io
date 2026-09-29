export type DistrictId = 'gate' | 'software' | 'vision' | 'arcade' | 'archive' | 'lab' | 'tower';
export type ProjectShot = { src: string; alt: string; caption: string };
export type Project = { id: string; name: string; category: string; description: string; stack: string[]; source?: string; live?: string; details?: string[]; screenshots?: ProjectShot[] };
export type Landmark = { id: string; district: DistrictId; x: number; z: number; radius: number; project?: string; title: string; kicker: string; body: string };

export const github = 'https://github.com/notAnKy';
export const currentPortfolio = 'https://mohamed-ali-portfolio-omega.vercel.app/';

export const districts: { id: DistrictId; name: string; x: number; z: number; color: number; short: string }[] = [
  { id: 'gate', name: 'THE GATE', x: 0, z: 13, color: 0xe9b86e, short: '01 / ARRIVAL' },
  { id: 'software', name: 'SOFTWARE DISTRICT', x: -29, z: -12, color: 0x6ebfc3, short: '02 / SYSTEMS' },
  { id: 'vision', name: 'VISION LAB', x: 0, z: -39, color: 0x8bb6a7, short: '03 / PERCEPTION' },
  { id: 'arcade', name: 'ARCADE DISTRICT', x: 30, z: -13, color: 0xf3a770, short: '04 / PLAY' },
  { id: 'archive', name: 'ARCHIVE', x: 29, z: 19, color: 0xc9bf9d, short: '05 / THE JOURNEY' },
  { id: 'lab', name: 'THE LAB', x: 0, z: 38, color: 0xb3a9d4, short: '06 / EXPERIMENTS' },
  { id: 'tower', name: 'SIGNAL TOWER', x: -30, z: 19, color: 0xf2c47c, short: '07 / CONNECT' },
];

export const projects: Project[] = [
  { id: 'hardwareprobe', name: 'HardwareProbe', category: 'Browser diagnostics', description: 'A browser hardware diagnostics tool for controllers, displays, GPUs, speakers, microphones, keyboards, and mice.', stack: ['React', 'TypeScript', 'Browser APIs'], source: `${github}/hardwareprobe`, live: 'https://hardwareprobe.vercel.app/', details: ['Controller drift and circularity', 'Display and audio tests', 'Live hardware readouts'], screenshots: [
    { src: '/project-shots/hardwareprobe/home.png', alt: 'HardwareProbe dashboard with hardware diagnostic tools', caption: 'Hardware diagnostics dashboard' },
    { src: '/project-shots/hardwareprobe/gamepad.png', alt: 'HardwareProbe gamepad testing interface', caption: 'Controller testing' },
    { src: '/project-shots/hardwareprobe/display.png', alt: 'HardwareProbe display testing interface', caption: 'Display tests' },
  ] },
  { id: 'fnhub', name: 'FNHub', category: 'Companion web app', description: 'A Fortnite companion app with a live item shop, interactive map, cosmetics, player stats, news, and game modes.', stack: ['React', 'TypeScript', 'Tailwind'], source: `${github}/fortnitehub`, live: 'https://fortnitehub.vercel.app/', screenshots: [
    { src: '/project-shots/fortnitehub/item-shop.png', alt: 'FNHub live item shop with cosmetics', caption: 'Live item shop' },
    { src: '/project-shots/fortnitehub/map.png', alt: 'FNHub interactive Fortnite map', caption: 'Interactive map' },
    { src: '/project-shots/fortnitehub/cosmetics.png', alt: 'FNHub cosmetics browser', caption: 'Cosmetics browser' },
  ] },
  { id: 'game-library', name: 'Game Library', category: 'Social platform', description: 'A social game tracking and discovery platform with profiles, collections, reviews, lists, and an activity feed.', stack: ['Next.js', 'TypeScript', 'Supabase'], source: `${github}/game-library`, live: 'https://game-library-cyan-ten.vercel.app/', screenshots: [
    { src: '/project-shots/game-library/discover.webp', alt: 'Game Library discover page', caption: 'Discover games' },
    { src: '/project-shots/game-library/library.webp', alt: 'Game Library collection page', caption: 'Your library' },
    { src: '/project-shots/game-library/profile.webp', alt: 'Game Library player profile', caption: 'Player profile' },
  ] },
  { id: 'nova', name: 'Nova', category: 'Collaboration workspace', description: 'A real-time team workspace with channels, messages, threads, file sharing, search, notifications, tasks, and decisions.', stack: ['Next.js', 'TypeScript', 'Supabase', 'Realtime'], source: `${github}/nova`, live: 'https://nova-seven-bice.vercel.app/', details: ['Public and private channels', 'Direct and group messages', 'Workspace projects, tasks, and decisions'], screenshots: [
    { src: '/project-shots/nova/login.png', alt: 'Nova public sign-in screen', caption: 'Public sign-in screen · workspace content requires an account' },
  ] },
  { id: 'clip', name: 'Clip', category: 'Offline creative tool', description: 'An offline Windows gameplay clip editor for trimming, vertical framing, hook text, music, and FFmpeg export.', stack: ['Electron', 'React', 'TypeScript', 'FFmpeg'], source: `${github}/clip`, screenshots: [
    { src: '/project-shots/clip/03-trim-and-crop.png', alt: 'Clip editor trim and crop controls', caption: 'Trim and crop gameplay' },
    { src: '/project-shots/clip/04-export-panel.png', alt: 'Clip editor export panel', caption: 'Offline export controls' },
  ] },
  { id: 'plates', name: 'Tunisian Plate Recognition', category: 'Computer vision', description: 'A two-stage vision pipeline. YOLOv8 locates Tunisian license plates; a character model reads them without an external OCR engine. The held-out test reached 93.3% exact full-plate match.', stack: ['Python', 'YOLOv8', 'PyTorch', 'OpenCV'] },
  { id: 'riftbound', name: 'Riftbound Survivors', category: 'Solo game development', description: 'A Godot 4 wave-survival game with 20 waves, 11 weapons, 25 items, 9 enemy types, 2 bosses, and local co-op.', stack: ['Godot 4', 'GDScript'], source: `${github}/riftbound-survivors`, live: 'https://riftbound-web-iota.vercel.app/', screenshots: [
    { src: '/project-shots/riftbound-survivors/combat.png', alt: 'Riftbound Survivors arena combat', caption: 'Wave-survival combat' },
    { src: '/project-shots/riftbound-survivors/shop.png', alt: 'Riftbound Survivors between-wave shop', caption: 'Between-wave shop' },
    { src: '/project-shots/riftbound-survivors/coop-lobby.png', alt: 'Riftbound Survivors co-op lobby', caption: 'Local co-op lobby' },
  ] },
  { id: 'isitvibecoded', name: 'Is It Vibe Coded?', category: 'Website analysis', description: 'An explainable website inspector that scores visible design and code patterns, with evidence and clear uncertainty rather than claims about authorship.', stack: ['Next.js', 'TypeScript', 'Cheerio', 'Playwright'], source: `${github}/isitvibecoded`, live: 'https://isitvibecoded-theta.vercel.app/', screenshots: [
    { src: '/project-shots/isitvibecoded/landing.png', alt: 'Is It Vibe Coded landing page and example score', caption: 'Website inspector' },
    { src: '/project-shots/isitvibecoded/analysis.png', alt: 'Is It Vibe Coded example analysis report', caption: 'Labeled example report' },
    { src: '/project-shots/isitvibecoded/evidence.png', alt: 'Expanded evidence behind the example Vibe Score', caption: 'Evidence and explanations' },
  ] },
];

export const landmarks: Landmark[] = [
  { id: 'intro', district: 'gate', x: 0, z: 12, radius: 8, title: 'MOHAMED ALI JEMMALI', kicker: 'SOFTWARE ENGINEER / BUILDER', body: 'An engineering student who likes building useful software, AI systems, tools, and games.' },
  { id: 'hardwareprobe', district: 'software', x: -40, z: -17, radius: 6.5, project: 'hardwareprobe', title: 'HARDWAREPROBE', kicker: 'DIAGNOSTIC GARAGE', body: 'Test what your browser can see.' },
  { id: 'fnhub', district: 'software', x: -31, z: -29, radius: 6.5, project: 'fnhub', title: 'FNHUB', kicker: 'RADAR STATION', body: 'A live companion for a changing game world.' },
  { id: 'game-library', district: 'software', x: -17, z: -22, radius: 6, project: 'game-library', title: 'GAME LIBRARY', kicker: 'THE STACKS', body: 'Track, review, and discover games together.' },
  { id: 'clip', district: 'software', x: -39, z: -2, radius: 6, project: 'clip', title: 'CLIP', kicker: 'EDIT BAY', body: 'Turn wide gameplay into vertical stories.' },
  { id: 'nova', district: 'software', x: -20, z: -7, radius: 6, project: 'nova', title: 'NOVA', kicker: 'COLLABORATION HUB', body: 'Channels, messages, tasks, and decisions in one workspace.' },
  { id: 'plates', district: 'vision', x: 2, z: -47, radius: 8, project: 'plates', title: 'TUNISIAN PLATE RECOGNITION', kicker: 'VISION LAB / MAIN EXPERIMENT', body: '93.3% exact full-plate match on the held-out test.' },
  { id: 'riftbound', district: 'arcade', x: 37, z: -19, radius: 8, project: 'riftbound', title: 'RIFTBOUND SURVIVORS', kicker: 'ARCADE ARENA', body: '20 waves. Two players. Built solo in Godot 4.' },
  { id: 'timeline', district: 'archive', x: 32, z: 19, radius: 10, title: 'DRIVE THROUGH TIME', kicker: 'ARCHIVE / 2022—2028', body: 'Studies, internships, software, and computer vision.' },
  { id: 'terminal', district: 'lab', x: 2, z: 39, radius: 8, title: 'THE LAB', kicker: 'OPEN TERMINAL', body: 'A place for unfinished ideas and useful experiments.' },
  { id: 'isitvibecoded', district: 'lab', x: 16, z: 45, radius: 6, project: 'isitvibecoded', title: 'IS IT VIBE CODED?', kicker: 'PATTERN OBSERVATORY', body: 'Inspect the evidence behind a website Vibe Score.' },
  { id: 'contact', district: 'tower', x: -30, z: 22, radius: 10, title: 'SIGNAL TOWER', kicker: 'OPEN TO OPPORTUNITIES', body: 'Thanks for exploring. The road stays open.' },
];

export const timeline = [
  { year: '2022–2025', title: 'ISET MAHDIA', text: 'Licence in Information Technology · Mention Bien' },
  { year: '2023–2024', title: 'QUETATECH', text: 'Software Development Intern · Attendance desktop application and WordPress plugins for REST APIs and QR-code certificate scanning.' },
  { year: '2025', title: 'ACOBA', text: 'Full-Stack & AI Developer · Final-year project. Built Cam2Drive video-surveillance features.' },
  { year: '2025–2028', title: 'TEK-UP UNIVERSITY', text: 'National Engineering Diploma · In progress' },
  { year: '2026', title: 'IN2 TECHNOLOGIES', text: 'Computer Vision Engineering Intern · Built and evaluated a Tunisian license plate recognition pipeline.' },
];

export const experiments = ['StudyMind', 'SecureOps', 'Cam2Drive', 'Internship Assistant', 'Marsa', 'Agent Select case study', 'Tijara', 'Time Tracker', 'WordPress Club API', 'WordPress QR Docs'];
export const skills = ['React', 'TypeScript', 'Next.js', 'Electron', 'Python', 'PyTorch', 'YOLOv8', 'OpenCV', 'scikit-learn', 'LangChain', 'LangGraph', 'RAG', 'Godot 4', 'GDScript'];
