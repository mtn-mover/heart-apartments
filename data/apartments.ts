export type ApartmentImage = {
  src: string;
  alt: string;
  category: string;
};

export type Apartment = {
  id: string;
  name: string;
  airbnbUrl: string;
  en: {
    title: string;
    subtitle: string;
    description: string;
    location: string;
    idealFor: string[];
  };
  de: {
    title: string;
    subtitle: string;
    description: string;
    location: string;
    idealFor: string[];
  };
  specs: {
    guests: number;
    bedrooms: number;
    beds: number;
    baths: number; // e.g., 1.5 for 1 full bath + 1 half bath
  };
  amenities: string[];
  images: ApartmentImage[];
  featured: boolean;
};

export const apartments: Apartment[] = [
  {
    id: 'heart1',
    name: 'HEART1',
    airbnbUrl: 'https://www.airbnb.com/rooms/18552489',
    en: {
      title: 'HEART1 - Cosy, Central, AC & Lift',
      subtitle: 'Modern apartment with air conditioning and elevator',
      description: 'Centrally located apartment in Interlaken, just 200m from Interlaken West train station. Perfect for exploring the Jungfrau region with all modern amenities including air conditioning and elevator access. The apartment features a fully equipped kitchen, comfortable bedrooms, and a private patio.',
      location: 'Central Interlaken, 200m from Interlaken West Station',
      idealFor: ['Families', 'Couples', 'Groups exploring Jungfrau'],
    },
    de: {
      title: 'HEART1 - Gemütlich, Zentral, Klimaanlage & Aufzug',
      subtitle: 'Moderne Wohnung mit Klimaanlage und Aufzug',
      description: 'Zentral gelegene Wohnung in Interlaken, nur 200 m vom Bahnhof Interlaken West entfernt. Perfekt für die Erkundung der Jungfrauregion mit allen modernen Annehmlichkeiten wie Klimaanlage und Aufzug. Die Wohnung verfügt über eine voll ausgestattete Küche, komfortable Schlafzimmer und eine private Terrasse.',
      location: 'Zentrum Interlaken, 200m vom Bahnhof Interlaken West',
      idealFor: ['Familien', 'Paare', 'Gruppen für Jungfrau-Erkundung'],
    },
    specs: {
      guests: 4,
      bedrooms: 2,
      beds: 3,
      baths: 1.5,
    },
    amenities: ['ac', 'elevator', 'wifi', 'kitchen', 'patio'],
    images: [
      { src: '/images/heart1/heards_1_1_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart1/heards_1_2_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart1/heards_1_3_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart1/heards_1_4_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart1/heards_1_5_kitchenette.jpg', alt: 'Kitchen', category: 'kitchen' },
      { src: '/images/heart1/heards_1_6_kitchenette.jpg', alt: 'Kitchen', category: 'kitchen' },
      { src: '/images/heart1/heards_1_7_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart1/heards_1_8_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart1/heards_1_9_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart1/heards_1_10_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart1/heards_1_11_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart1/heards_1_12_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart1/heards_1_13_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart1/heards_1_14_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart1/heards_1_15_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart1/heards_1_16_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart1/heards_1_17_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart1/heards_1_18_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart1/heards_1_19_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart1/heards_1_20_half_bathroom.jpg', alt: 'Half Bathroom', category: 'bathroom' },
      { src: '/images/heart1/heards_1_21_patio.jpg', alt: 'Patio', category: 'outdoor' },
    ],
    featured: true,
  },
  {
    id: 'heart2',
    name: 'HEART2',
    airbnbUrl: 'https://www.airbnb.com/rooms/24131251',
    en: {
      title: 'HEART2 - Cosy, Central, AC & Lift',
      subtitle: 'Centrally located with modern comforts',
      description: 'Welcome! Centrally located apartment in Interlaken, just a short walk from train station Interlaken West (200m). A bus stop is right next to the building, making it easy to explore the region. Features a beautiful balcony with views.',
      location: 'Central Interlaken, 200m from Interlaken West Station',
      idealFor: ['Families', 'Couples', 'Adventure seekers'],
    },
    de: {
      title: 'HEART2 - Gemütlich, Zentral, Klimaanlage & Aufzug',
      subtitle: 'Zentral gelegen mit modernem Komfort',
      description: 'Willkommen! Zentral gelegene Wohnung in Interlaken, nur einen kurzen Spaziergang vom Bahnhof Interlaken West (200 m) entfernt. Eine Bushaltestelle befindet sich direkt neben dem Gebäude. Verfügt über einen schönen Balkon mit Aussicht.',
      location: 'Zentrum Interlaken, 200m vom Bahnhof Interlaken West',
      idealFor: ['Familien', 'Paare', 'Abenteuersuchende'],
    },
    specs: {
      guests: 4,
      bedrooms: 2,
      beds: 4,
      baths: 1.5,
    },
    amenities: ['ac', 'elevator', 'wifi', 'kitchen', 'balcony'],
    images: [
      { src: '/images/heart2/heards_2_1_dining area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart2/heards_2_2_dining area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart2/heards_2_3_dining area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart2/heards_2_4_dining area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart2/heards_2_5_dining area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart2/heards_2_6_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart2/heards_2_7_kitchentte.jpg', alt: 'Kitchen', category: 'kitchen' },
      { src: '/images/heart2/heards_2_8_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart2/heards_2_9_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart2/heards_2_10_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart2/heards_2_11_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart2/heards_2_12_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart2/heards_2_13_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart2/heards_2_14_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart2/heards_2_15_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart2/heards_2_16_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart2/heards_2_17_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart2/heards_2_18_half_bathroom.jpg', alt: 'Half Bathroom', category: 'bathroom' },
      { src: '/images/heart2/heards_2_19_balcony.jpg', alt: 'Balcony', category: 'outdoor' },
    ],
    featured: true,
  },
  {
    id: 'heart3',
    name: 'HEART3',
    airbnbUrl: 'https://www.airbnb.com/rooms/19632116',
    en: {
      title: 'HEART3 of Interlaken',
      subtitle: 'Elevator, AC, up to 4 people',
      description: 'Modern apartment with elevator and air conditioning in the heart of Interlaken. Ideal base for exploring the stunning Jungfrau region and Swiss Alps. Features a full kitchen, two comfortable bedrooms, and a lovely patio.',
      location: 'Central Interlaken',
      idealFor: ['Families', 'Groups', 'Mountain lovers'],
    },
    de: {
      title: 'HEART3 von Interlaken',
      subtitle: 'Aufzug, Klimaanlage, bis zu 4 Personen',
      description: 'Moderne Wohnung mit Aufzug und Klimaanlage im Herzen von Interlaken. Idealer Ausgangspunkt für die Erkundung der atemberaubenden Jungfrauregion und der Schweizer Alpen. Verfügt über eine voll ausgestattete Küche, zwei komfortable Schlafzimmer und eine schöne Terrasse.',
      location: 'Zentrum Interlaken',
      idealFor: ['Familien', 'Gruppen', 'Bergliebhaber'],
    },
    specs: {
      guests: 4,
      bedrooms: 2,
      beds: 3,
      baths: 1.5,
    },
    amenities: ['ac', 'elevator', 'wifi', 'kitchen', 'patio'],
    images: [
      { src: '/images/heart3/heards3_1_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart3/heards3_2_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart3/heards3_3_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart3/heards3_4_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart3/heards3_5_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart3/heards3_6_full_kitchen.jpg', alt: 'Full Kitchen', category: 'kitchen' },
      { src: '/images/heart3/heards3_7_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart3/heards3_8_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart3/heards3_9_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart3/heards3_10_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart3/heards3_11_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart3/heards3_12_bedroom_1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart3/heards3_13_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart3/heards3_14_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart3/heards3_15_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart3/heards3_16_bedroom_2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart3/heards3_17_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart3/heards3_18_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart3/heards3_19_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart3/heards3_20_half_bathroom.jpg', alt: 'Half Bathroom', category: 'bathroom' },
      { src: '/images/heart3/heards3_21_half_bathroom.jpg', alt: 'Half Bathroom', category: 'bathroom' },
      { src: '/images/heart3/heards3_22_patio.jpg', alt: 'Patio', category: 'outdoor' },
    ],
    featured: true,
  },
  {
    id: 'heart4',
    name: 'HEART4',
    airbnbUrl: 'https://www.airbnb.com/rooms/20281126',
    en: {
      title: 'HEART4 of Interlaken',
      subtitle: 'Elevator, AC, up to 4 people',
      description: 'Centrally located apartment in Interlaken, just a short walk from train station Interlaken West (200m). Modern amenities including air conditioning and elevator access. Spacious living room and fully equipped kitchen.',
      location: 'Central Interlaken, 200m from Interlaken West Station',
      idealFor: ['Families', 'Couples', 'Hikers'],
    },
    de: {
      title: 'HEART4 von Interlaken',
      subtitle: 'Aufzug, Klimaanlage, bis zu 4 Personen',
      description: 'Zentral gelegene Wohnung in Interlaken, nur einen kurzen Spaziergang vom Bahnhof Interlaken West (200 m) entfernt. Moderne Ausstattung mit Klimaanlage und Aufzug. Geräumiges Wohnzimmer und voll ausgestattete Küche.',
      location: 'Zentrum Interlaken, 200m vom Bahnhof Interlaken West',
      idealFor: ['Familien', 'Paare', 'Wanderer'],
    },
    specs: {
      guests: 4,
      bedrooms: 1,
      beds: 4,
      baths: 1,
    },
    amenities: ['ac', 'elevator', 'wifi', 'kitchen'],
    images: [
      { src: '/images/heart4/heards4_1_living_room.jpg', alt: 'Living Room', category: 'living' },
      { src: '/images/heart4/heards4_2_living_room.jpg', alt: 'Living Room', category: 'living' },
      { src: '/images/heart4/heards4_3_living_room.jpg', alt: 'Living Room', category: 'living' },
      { src: '/images/heart4/heards4_4_living_room.jpg', alt: 'Living Room', category: 'living' },
      { src: '/images/heart4/heards4_5_full_kitchen.jpg', alt: 'Full Kitchen', category: 'kitchen' },
      { src: '/images/heart4/heards4_6_full_kitchen.jpg', alt: 'Full Kitchen', category: 'kitchen' },
      { src: '/images/heart4/heards4_7_full_kitchen.jpg', alt: 'Full Kitchen', category: 'kitchen' },
      { src: '/images/heart4/heards4_8_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart4/heards4_9_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart4/heards4_10_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart4/heards4_11_bedroom.jpg', alt: 'Bedroom', category: 'bedroom' },
      { src: '/images/heart4/heards4_13_bedroom.jpg', alt: 'Bedroom', category: 'bedroom' },
      { src: '/images/heart4/heards4_14_bedroom.jpg', alt: 'Bedroom', category: 'bedroom' },
      { src: '/images/heart4/heards4_15_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart4/heards4_16_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart4/heards4_17_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart4/heards4_97.jpg', alt: 'Apartment View', category: 'other' },
      { src: '/images/heart4/heards4_98.jpg', alt: 'Apartment View', category: 'other' },
      { src: '/images/heart4/heards4_99.jpg', alt: 'Apartment View', category: 'other' },
    ],
    featured: true,
  },
  {
    id: 'heart5',
    name: 'HEART5',
    airbnbUrl: 'https://www.airbnb.com/rooms/1006983308851279367',
    en: {
      title: 'HEART5 - Cosy Jewel as Home Base',
      subtitle: 'Renovated charm in traditional Swiss chalet',
      description: 'Welcome to our renovated jewel in the heart of Interlaken! The apartment is nestled in a charming old wooden chalet and shines in new splendor. Experience authentic Swiss charm with modern comforts. Perfect for those seeking a unique, traditional experience.',
      location: 'Heart of Interlaken, Traditional Swiss Chalet',
      idealFor: ['Couples', 'Families', 'Culture lovers'],
    },
    de: {
      title: 'HEART5 - Gemütliches Juwel als Heimatbasis',
      subtitle: 'Renovierter Charme im traditionellen Schweizer Chalet',
      description: 'Willkommen in unserem renovierten Juwel im Herzen von Interlaken! Die Wohnung befindet sich in einem charmanten alten Holzchalet und erstrahlt in neuem Glanz. Erleben Sie authentischen Schweizer Charme mit modernem Komfort. Perfekt für alle, die ein einzigartiges, traditionelles Erlebnis suchen.',
      location: 'Herz von Interlaken, Traditionelles Schweizer Chalet',
      idealFor: ['Paare', 'Familien', 'Kulturliebhaber'],
    },
    specs: {
      guests: 4,
      bedrooms: 2,
      beds: 3,
      baths: 1,
    },
    amenities: ['wifi', 'kitchen', 'charm', 'traditional'],
    images: [
      { src: '/images/heart5/heards5_1_living_room.jpg', alt: 'Living Room', category: 'living' },
      { src: '/images/heart5/heards5_2_living_room.jpg', alt: 'Living Room', category: 'living' },
      { src: '/images/heart5/heards5_3_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart5/heards5_4_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart5/heards5_5_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart5/heards5_6_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart5/heards5_7_dining_area.jpg', alt: 'Dining Area', category: 'dining' },
      { src: '/images/heart5/heards5_8_bedroom1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart5/heards5_9_bedroom1.jpg', alt: 'Bedroom 1', category: 'bedroom' },
      { src: '/images/heart5/heards5_10_bedroom2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart5/heards5_11_bedroom2.jpg', alt: 'Bedroom 2', category: 'bedroom' },
      { src: '/images/heart5/heards5_12_full_barhroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart5/heards5_13_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart5/heards5_14_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart5/heards5_15_full_bathroom.jpg', alt: 'Full Bathroom', category: 'bathroom' },
      { src: '/images/heart5/heards5_16.jpg', alt: 'Exterior View', category: 'outdoor' },
    ],
    featured: true,
  },
];

export const amenityIcons: Record<string, { icon: string; key: string }> = {
  ac: { icon: '❄️', key: 'ac' },
  elevator: { icon: '🛗', key: 'elevator' },
  wifi: { icon: '📶', key: 'wifi' },
  kitchen: { icon: '🍳', key: 'kitchen' },
  charm: { icon: '✨', key: 'charm' },
  traditional: { icon: '🏡', key: 'traditional' },
  balcony: { icon: '🌅', key: 'balcony' },
  patio: { icon: '🌿', key: 'patio' },
};

export function getApartmentById(id: string): Apartment | undefined {
  return apartments.find(apt => apt.id === id);
}

export function getOtherApartments(currentId: string): Apartment[] {
  return apartments.filter(apt => apt.id !== currentId);
}
