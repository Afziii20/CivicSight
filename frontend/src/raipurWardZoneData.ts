/**
 * Raipur Municipal Corporation (RMC) — Ward & Zone Data
 *
 * Based on official RMC records (nagarnigamraipur.nic.in).
 * 70 wards across 10 administrative zones.
 */

// ── Ward → Zone mapping ────────────────────────────────────────────────
export const WARD_ZONE_MAP: Record<number, number> = {
  // Zone 1
  3: 1, 4: 1, 5: 1, 15: 1, 16: 1, 17: 1, 18: 1,
  // Zone 2
  6: 2, 13: 2, 14: 2, 26: 2, 27: 2, 28: 2, 36: 2,
  // Zone 3
  10: 3, 11: 3, 12: 3, 29: 3, 30: 3,
  // Zone 4
  31: 4, 32: 4, 33: 4, 34: 4, 35: 4, 37: 4, 38: 4, 39: 4, 40: 4,
  // Zone 5
  41: 5, 42: 5, 43: 5, 44: 5, 45: 5, 46: 5, 47: 5, 48: 5, 49: 5, 50: 5,
  // Zone 6
  51: 6, 52: 6, 53: 6, 54: 6, 55: 6, 56: 6, 57: 6, 58: 6, 59: 6, 60: 6,
  // Zone 7
  22: 7, 23: 7, 24: 7, 25: 7,
  // Zone 8
  1: 8, 2: 8, 19: 8, 20: 8, 21: 8,
  // Zone 9
  7: 9, 8: 9, 9: 9,
  // Zone 10
  61: 10, 62: 10, 63: 10, 64: 10, 65: 10, 66: 10, 67: 10, 68: 10, 69: 10, 70: 10,
};

// ── Zone → Wards mapping (reverse lookup) ──────────────────────────────
export const ZONE_WARDS_MAP: Record<number, number[]> = {};
for (const [ward, zone] of Object.entries(WARD_ZONE_MAP)) {
  const z = zone;
  if (!ZONE_WARDS_MAP[z]) ZONE_WARDS_MAP[z] = [];
  ZONE_WARDS_MAP[z].push(Number(ward));
}
// Sort wards within each zone
for (const z of Object.keys(ZONE_WARDS_MAP)) {
  ZONE_WARDS_MAP[Number(z)].sort((a, b) => a - b);
}

// ── Ward Names ─────────────────────────────────────────────────────────
export const WARD_NAMES: Record<number, string> = {
  1: 'Veer Savarkar Nagar',
  2: 'Pt. Jawaharlal Nehru',
  3: 'Sant Kabir Das',
  4: 'Yatiyatan Lal',
  5: 'Banjari Mata',
  6: 'Veerangana Avanti Bai',
  7: 'Kushabhau Thakre',
  8: 'Pt. Motilal Nehru',
  9: 'Dr. Bhimrao Ambedkar',
  10: 'Rani Laxmi Bai',
  11: 'Kali Mata',
  12: 'Mahatma Gandhi',
  13: 'Rajiv Gandhi',
  14: 'Raman Mandir',
  15: 'Kanhaiya Lal Bajari',
  16: 'Veer Shivaji',
  17: 'Thakkar Bapa',
  18: 'Bal Gangadhar Tilak',
  19: 'Dr. A.P.J. Abdul Kalam',
  20: 'Ram Krishna Paramhans',
  21: 'Shaheed Bhagat Singh',
  22: 'Pt. Ishwaricharan Shukla',
  23: 'Manmohan Singh Bakshi',
  24: 'Sardar Vallabh Bhai Patel',
  25: 'Sant Ram Das',
  26: 'Danveer Bhamashah',
  27: 'Indira Gandhi',
  28: 'Shaheed Hemu Kalani',
  29: 'Guru Govind Singh',
  30: 'Shankar Nagar',
  31: 'Netaji Subhashchandra Bose',
  32: 'Maharishi Valmiki',
  33: 'Shahid Veernarayan',
  34: 'Pt. Ravishankar Shukla',
  35: 'Havaldar Abdul Hamid',
  36: 'Tatyapara',
  37: 'Shahid Chudamani Nayak',
  38: 'Swami Atmanand',
  39: 'Thakur Pyarelal',
  40: 'Pt. Dindayal Upadhyay',
  41: 'Pt. Sundar Lal Sharma',
  42: 'Mahant Laxminarayan Das',
  43: 'Brahmanpara',
  44: 'Swami Vivekanand Sadar Bazar',
  45: 'Maulana Abdul Rauf',
  46: 'Civil Lines',
  47: 'Mother Teresa',
  48: 'Guru Ghasidas',
  49: 'Rani Durgavati',
  50: 'Pt. Vidyacharan Shukla',
  51: 'Lal Bahadur Shastri',
  52: 'Dr. Rajendra Prasad',
  53: 'Babu Jagjivan Ram',
  54: 'Kamred Sudhir Mukharjee',
  55: 'Rabindranath Tagore',
  56: 'Chandrashekhar Azad',
  57: 'Swami Dayanand Saraswati',
  58: 'Shaheed Udham Singh',
  59: 'Maharana Pratap',
  60: 'Atal Bihari Vajpayee',
  61: 'Rajendra Nagar',
  62: 'Sunder Nagar',
  63: 'Nehru Nagar',
  64: 'Shastri Nagar',
  65: 'Mana',
  66: 'Birgaon',
  67: 'Amanaka',
  68: 'Tatibandh',
  69: 'Saddu',
  70: 'Rawabhata',
};

// ── Locality → Ward mapping ────────────────────────────────────────────
// Maps well-known Raipur localities, colonies, and neighborhoods to ward numbers.
// Used for auto-detecting ward from reverse-geocoded addresses.
const LOCALITY_WARD_MAP: Record<string, number> = {
  // Zone 1 areas
  'gogaon': 3, 'sitanagar': 3, 'sita nagar': 3,
  'suryanagar': 4, 'surya nagar': 4, 'godanwara': 4,
  'banjari': 5, 'banjari mata': 5,
  'sukhram nagar': 15, 'vijay nagar': 15,
  'timber market': 16, 'khamtarai': 16, 'khamatarai': 16,
  'dhanlaxmi nagar': 17, 'dhan laxmi nagar': 17,
  'bhanpuri': 18,

  // Zone 2 areas
  'shanti nagar': 6, 'avanti bai': 6,
  'rajiv gandhi ward': 13, 'devendra nagar sector 3': 13,
  'raman mandir': 14,
  'bhamashah': 26, 'danveer bhamashah': 26,
  'devendra nagar': 28, 'devendra nagar sector 1': 28, 'devendra nagar sector 2': 28,
  'devendra nagar sector 4': 28,
  'indira gandhi ward': 27,
  'hemu kalani': 28,
  'tatyapara': 36, 'tatya para': 36,

  // Zone 3 areas
  'rani laxmi bai': 10,
  'ambedkar': 11,
  'mahatma gandhi ward': 12, 'devendra nagar sector 5': 12,
  'guru govind singh': 29,
  'shankar nagar': 30, 'shankarnagar': 30,

  // Zone 4 areas
  'subhash nagar': 31, 'netaji nagar': 31,
  'valmiki nagar': 32,
  'ravishankar nagar': 34, 'pt ravishankar shukla': 34,
  'hamid nagar': 35,
  'chudamani nagar': 37,
  'atmanand nagar': 38,
  'pyarelal nagar': 39,
  'dindayal nagar': 40,

  // Zone 5 areas
  'sundar lal nagar': 41,
  'laxminarayan das': 42,
  'brahmanpara': 43, 'brahman para': 43,
  'sadar bazar': 44, 'sadar bazaar': 44, 'sadar': 44,
  'maulana rauf': 45,
  'civil lines': 46, 'civil line': 46,
  'telibandha': 48, 'teli bandha': 48,
  'durgavati': 49,
  'vidyacharan': 50,

  // Zone 6 areas
  'mathpurena': 53, 'tikrapara': 53,
  'pandri': 54, 'pandri bazar': 54,
  'tagore nagar': 55, 'tagore town': 55,
  'azad nagar': 56,
  'dayanand nagar': 57,
  'udham singh nagar': 58,
  'pratap nagar': 59,

  // Zone 7 areas
  'ishwari charan': 22,
  'bakshi nagar': 23,
  'patel nagar': 24, 'sardar patel nagar': 24,
  'ramdas nagar': 25, 'sant ram das': 25,

  // Zone 8 areas
  'savarkar nagar': 1, 'veer savarkar': 1,
  'nehru nagar old': 2, 'jawaharlal nehru ward': 2,
  'kalam nagar': 19, 'abdul kalam': 19,
  'paramhans nagar': 20,
  'bhagat singh nagar': 21,

  // Zone 9 areas
  'kushabhau nagar': 7, 'kushabhau thakre': 7,
  'motilal nehru nagar': 8,
  'bhimrao ambedkar nagar': 9,

  // Zone 10 areas
  'rajendra nagar': 61,
  'sunder nagar': 62, 'sundar nagar zone 10': 62,
  'nehru nagar': 63,
  'shastri nagar': 64,
  'mana': 65, 'mana camp': 65,
  'birgaon': 66,
  'amanaka': 67,
  'tatibandh': 68,
  'saddu': 69,
  'rawabhata': 70, 'rawa bhata': 70,

  // Major landmarks / common localities
  'jaistambh chowk': 44, 'jaistambh': 44,
  'fafadih': 42, 'fafaadih': 42,
  'byron bazar': 43, 'budhapara': 43,
  'purani basti': 36,
  'gol bazar': 44, 'gol bazaar': 44,
  'malviya nagar': 34, 'malviya road': 34,
  'lakhe nagar': 40,
  'samta colony': 30,
  'professorcolony': 30, 'professor colony': 30,
  'engineers colony': 30,
  'shyam nagar': 29,
  'choubey colony': 12,
  'kota': 68,
  'boriyakhurd': 69,
  'daldal seoni': 62,
  'gudhiyari': 70,
  'hirapur': 66,
  'urla': 65,
  'siltara': 65,
  'bhatagaon': 61,
  'ring road': 40,
  'vip road': 48,
  'station road': 44,
  'jail road': 43,
  'mg road': 46, 'm.g. road': 46,
  'great eastern road': 46, 'ge road': 46,
  'marine drive': 48,
};

// ── Helper Functions ───────────────────────────────────────────────────

/** Get the zone number for a given ward. Returns null if ward is invalid. */
export function getZoneForWard(ward: number): number | null {
  return WARD_ZONE_MAP[ward] ?? null;
}

/** Get all ward numbers for a given zone. */
export function getWardsForZone(zone: number): number[] {
  return ZONE_WARDS_MAP[zone] ?? [];
}

/** Get all zone numbers (sorted). */
export function getAllZones(): number[] {
  return Object.keys(ZONE_WARDS_MAP).map(Number).sort((a, b) => a - b);
}

/** Get all ward numbers (sorted). */
export function getAllWards(): number[] {
  return Object.keys(WARD_ZONE_MAP).map(Number).sort((a, b) => a - b);
}

/**
 * Try to detect the ward number from a free-text address string.
 * Matches against known localities / neighborhoods.
 * Returns { ward, zone } or null if no match found.
 */
export function lookupWardZoneFromAddress(address: string): { ward: number; zone: number } | null {
  const normalized = address.toLowerCase().trim();

  // Try longest match first for better accuracy
  const entries = Object.entries(LOCALITY_WARD_MAP).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [locality, ward] of entries) {
    if (normalized.includes(locality)) {
      const zone = WARD_ZONE_MAP[ward];
      if (zone !== undefined) {
        return { ward, zone };
      }
    }
  }

  return null;
}
