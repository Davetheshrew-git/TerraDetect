export interface SampleSpecimen {
  id: string;
  title: string;
  description: string;
  suggestedDepth: string;
  suggestedVdi: string;
  metalType: string;
  tags: string[];
  imageUrl: string;
  notes: string;
}

// Crisp procedural SVG data URLs representing real metal detector finds
export const SAMPLE_SPECIMENS: SampleSpecimen[] = [
  {
    id: 'hadrian-denarius',
    title: 'Roman Silver Denarius (Hadrian)',
    description: 'Laureate bust of Emperor Hadrian facing right / Roma standing left holding victory.',
    suggestedDepth: '6 inches (15 cm)',
    suggestedVdi: '84',
    metalType: 'Silver',
    tags: ['Roman', 'Coin', 'Silver Denarius', 'Imperial'],
    notes: 'Recovered from ploughed pasture in Wiltshire near old Roman road. Solid crisp tone on Minelab Equinox.',
    imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><radialGradient id="silverGlow" cx="40%" cy="35%" r="60%"><stop offset="0%" stop-color="%23f1f5f9"/><stop offset="50%" stop-color="%2394a3b8"/><stop offset="85%" stop-color="%23475569"/><stop offset="100%" stop-color="%231e293b"/></radialGradient><radialGradient id="patina" cx="50%" cy="50%" r="50%"><stop offset="60%" stop-color="%23000000" stop-opacity="0"/><stop offset="100%" stop-color="%230f172a" stop-opacity="0.8"/></radialGradient></defs><rect width="400" height="400" fill="%2309090b"/><circle cx="200" cy="200" r="150" fill="url(%23silverGlow)" stroke="%23334155" stroke-width="4"/><circle cx="200" cy="200" r="148" fill="url(%23patina)"/><path d="M190 120 Q225 110 240 140 Q255 170 240 195 Q230 210 205 215 L200 250 L185 250 L180 215 Q150 205 145 180 Q140 150 165 130 Z" fill="%2364748b" opacity="0.85"/><circle cx="215" cy="155" r="5" fill="%23cbd5e1"/><path d="M165 145 Q190 135 220 145" stroke="%23cbd5e1" stroke-width="3" fill="none"/><path d="M185 170 Q215 170 230 180" stroke="%23334155" stroke-width="2" fill="none"/><text x="200" y="70" text-anchor="middle" fill="%23e2e8f0" font-family="serif" font-size="14" letter-spacing="4">HADRIANVS AVG COS III P P</text><text x="200" y="365" text-anchor="middle" fill="%2394a3b8" font-family="monospace" font-size="11">ROMAN IMPERIAL DENARIUS (c. 117-138 AD)</text></svg>'
  },
  {
    id: 'elizabeth-sixpence',
    title: 'Elizabeth I Hammered Silver Sixpence',
    description: 'Crowned bust of Queen Elizabeth I with rose behind ear, mint mark pheon or tun.',
    suggestedDepth: '4 inches (10 cm)',
    suggestedVdi: '78',
    metalType: 'Silver',
    tags: ['Tudor', 'Hammered Coin', 'Elizabeth I', 'Sixpence'],
    notes: 'Found in cultivated soil near hamlet boundary. Classic hammered coin wave/crease from circulation.',
    imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><radialGradient id="tudorSilver" cx="45%" cy="40%" r="55%"><stop offset="0%" stop-color="%23f8fafc"/><stop offset="60%" stop-color="%23cbd5e1"/><stop offset="85%" stop-color="%2364748b"/><stop offset="100%" stop-color="%23334155"/></radialGradient></defs><rect width="400" height="400" fill="%2309090b"/><circle cx="200" cy="200" r="145" fill="url(%23tudorSilver)" stroke="%23475569" stroke-width="3"/><path d="M90 200 Q200 80 310 200 Q200 320 90 200" stroke="%2394a3b8" stroke-dasharray="4 4" fill="none"/><circle cx="200" cy="200" r="110" stroke="%23475569" stroke-width="1.5" fill="none"/><path d="M175 140 Q200 115 225 140 Q235 170 220 200 L180 200 Z" fill="%2364748b"/><circle cx="240" cy="165" r="9" fill="%23f43f5e" opacity="0.75"/><text x="200" y="75" text-anchor="middle" fill="%23e2e8f0" font-family="serif" font-size="13" letter-spacing="3">ELIZABETH D G ANG FR ET HIB REGINA</text><text x="200" y="360" text-anchor="middle" fill="%2394a3b8" font-family="monospace" font-size="11">TUDOR HAMMERED SIXPENCE (1561-1602)</text></svg>'
  },
  {
    id: 'bronze-axehead',
    title: 'Middle Bronze Age Palstave Axehead',
    description: 'Loopless bronze palstave with prominent side flanges and deep stop-ridge.',
    suggestedDepth: '10 inches (25 cm)',
    suggestedVdi: '91',
    metalType: 'Bronze',
    tags: ['Bronze Age', 'Artefact', 'Palstave', 'Prehistoric', 'Axehead'],
    notes: 'Deep resonant signal on wet clay subsoil. Rich emerald green malachite patina with sharp blade tip.',
    imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><linearGradient id="bronzePatina" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23059669"/><stop offset="30%" stop-color="%23d97706"/><stop offset="70%" stop-color="%23047857"/><stop offset="100%" stop-color="%231e293b"/></linearGradient></defs><rect width="400" height="400" fill="%2309090b"/><path d="M165 90 L235 90 L220 220 L270 295 Q200 325 130 295 L180 220 Z" fill="url(%23bronzePatina)" stroke="%23047857" stroke-width="4"/><path d="M175 140 L225 140 L215 210 L185 210 Z" fill="%23065f46" opacity="0.6"/><text x="200" y="60" text-anchor="middle" fill="%2334d399" font-family="serif" font-size="14" letter-spacing="2">MIDDLE BRONZE AGE PALSTAVE</text><text x="200" y="360" text-anchor="middle" fill="%23fbbf24" font-family="monospace" font-size="11">c. 1400 - 1150 BC (EXCELLENT PATINA)</text></svg>'
  },
  {
    id: 'edward-penny',
    title: 'Edward I Hammered Silver Penny (London Mint)',
    description: 'Facing bust of Edward I within inner beaded circle / Long cross with three pellets in each angle.',
    suggestedDepth: '5 inches (12 cm)',
    suggestedVdi: '80',
    metalType: 'Silver',
    tags: ['Medieval', 'Hammered Coin', 'Edward I', 'Penny', 'Plantagenet'],
    notes: 'Classic Class 10cf hammered penny found 200m from ancient parish church footpath.',
    imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><radialGradient id="medSilver" cx="45%" cy="40%" r="55%"><stop offset="0%" stop-color="%23f1f5f9"/><stop offset="65%" stop-color="%23cbd5e1"/><stop offset="85%" stop-color="%23475569"/><stop offset="100%" stop-color="%230f172a"/></radialGradient></defs><rect width="400" height="400" fill="%2309090b"/><circle cx="200" cy="200" r="140" fill="url(%23medSilver)" stroke="%23334155" stroke-width="3"/><circle cx="200" cy="200" r="105" stroke="%2364748b" stroke-dasharray="3 3" fill="none"/><line x1="200" y1="65" x2="200" y2="335" stroke="%23475569" stroke-width="4"/><line x1="65" y1="200" x2="335" y2="200" stroke="%23475569" stroke-width="4"/><circle cx="160" cy="160" r="6" fill="%23334155"/><circle cx="175" cy="150" r="6" fill="%23334155"/><circle cx="170" cy="170" r="6" fill="%23334155"/><circle cx="240" cy="160" r="6" fill="%23334155"/><circle cx="225" cy="150" r="6" fill="%23334155"/><circle cx="230" cy="170" r="6" fill="%23334155"/><text x="200" y="50" text-anchor="middle" fill="%23e2e8f0" font-family="serif" font-size="13" letter-spacing="3">+EDW R ANGL DNS HYB</text><text x="200" y="370" text-anchor="middle" fill="%2394a3b8" font-family="monospace" font-size="11">CIVITAS LONDON (c. 1279-1307)</text></svg>'
  }
];
