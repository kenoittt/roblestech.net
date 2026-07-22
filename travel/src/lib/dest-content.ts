/*
 * Curated destination intelligence — zero-cost replacement for the AI layer.
 * Written/reviewed at build time (Claude-assisted authoring, no runtime API).
 * crowd: 12 chars Jan→Dec — p=peak, s=shoulder, o=off-season.
 * festivals: month-keyed (1-12); lunar-calendar events are approximate.
 */
export type Pack = {
  crowd: string;
  best_months: string[];
  best_reason: string;
  /** 12 entries Jan→Dec: the local climate season that month */
  seasons: string[];
  top: { name: string; why: string }[];
  gems: { name: string; why: string }[];
  adventures: { name: string; why: string }[];
  festivals: Record<number, { name: string; timing: string; note: string }[]>;
};

export const PACKS: Record<string, Pack> = {
  'Hanoi': {
    crowd: 'psooossssppp',
    seasons: ['Cool dry winter', 'Cool drizzly winter (crachin)', 'Warming spring, humid', 'Warm spring', 'Hot — summer rains begin', 'Hot rainy summer', 'Peak summer rains', 'Hot rainy summer', 'Rains easing', 'Golden dry autumn', 'Cool dry autumn', 'Cool dry winter'],
    best_months: ['October', 'November', 'March', 'April'],
    best_reason: 'dry, mild air and golden light between the sticky summer and the damp chill of deep winter',
    top: [
      { name: 'Old Quarter', why: '36 ancient streets of street food, silk and motorbike ballet' },
      { name: 'Hoan Kiem Lake & Ngoc Son Temple', why: 'dawn tai-chi and the city’s calm heart' },
      { name: 'Temple of Literature', why: 'Vietnam’s first university, a thousand years old' },
      { name: 'Train Street', why: 'espresso inches from a passing train (check running times)' },
    ],
    gems: [
      { name: 'Long Bien Bridge at sunrise', why: 'rusted Eiffel-era icon with banana-island views' },
      { name: 'Banana Island (Bai Giua)', why: 'rural river life ten minutes from the Old Quarter' },
      { name: 'Cafe Giang', why: 'the original egg coffee, hidden up an alley staircase' },
    ],
    adventures: [
      { name: 'Hang Mua peak, Ninh Binh (day trip)', why: '500 steps to a dragon-ridge view over Trang An karsts and paddies' },
      { name: 'Ba Vi National Park summit hike', why: 'cloud-forest temple at 1,296 m, 90 minutes from the city' },
      { name: 'Ham Lon Mountain trek', why: 'Hanoi’s closest proper summit — easy overnight camp lake' },
    ],
    festivals: {
      1: [{ name: 'Tet (Lunar New Year)', timing: 'late Jan–mid Feb, lunar', note: 'the city empties and glows — magical but many shops close for a week' }],
      2: [{ name: 'Perfume Pagoda Festival', timing: 'from mid Feb, lunar', note: 'huge riverboat pilgrimage south of the city' }],
      9: [{ name: 'Mid-Autumn Festival', timing: 'full moon, Sep–early Oct', note: 'lantern-lit streets and mooncakes, best around Hang Ma street' }],
      10: [{ name: 'Hanoi Liberation Day', timing: 'Oct 10', note: 'flags, concerts and fireworks around Hoan Kiem' }],
    },
  },
  'Ho Chi Minh City': {
    crowd: 'ppsooooosssp',
    seasons: ['Dry season, warm', 'Dry season, hot', 'Hot dry season', 'Hottest month, dry', 'Rainy season begins', 'Rainy season (afternoon downpours)', 'Rainy season', 'Rainy season', 'Peak rains', 'Heavy rains, easing late', 'Rains taper off', 'Dry season returns'],
    best_months: ['December', 'January', 'February', 'March'],
    best_reason: 'the dry season — hot but rain-free evenings made for rooftop bars and street food crawls',
    top: [
      { name: 'Ben Thanh Market & District 1', why: 'the city’s frantic, delicious core' },
      { name: 'War Remnants Museum', why: 'sobering, essential context for modern Vietnam' },
      { name: 'Cu Chi Tunnels (day trip)', why: 'crawl the wartime tunnel network' },
      { name: 'Bui Vien & backpacker quarter by night', why: 'neon chaos, best people-watching in Asia' },
    ],
    gems: [
      { name: 'Cafe apartment, 42 Nguyen Hue', why: 'nine floors of tiny cafés in a crumbling block' },
      { name: 'Binh Tay Market, Cholon', why: 'the real Chinatown wholesale bustle, tourist-light' },
      { name: 'Thao Dien by scooter ferry', why: 'leafy expat riverside without the bridge traffic' },
    ],
    adventures: [
      { name: 'Nui Ba Den (Black Virgin Mountain)', why: 'the south’s highest peak — hike up, cable car down, 2.5 hrs away' },
      { name: 'Can Gio mangrove biosphere', why: 'kayak and boardwalk through a UNESCO monkey-filled forest' },
      { name: 'Cat Tien National Park (overnight)', why: 'gibbons at dawn and night safaris in real jungle' },
    ],
    festivals: {
      1: [{ name: 'Tet (Lunar New Year)', timing: 'late Jan–mid Feb, lunar', note: 'Nguyen Hue flower street is spectacular; book rooms far ahead' }],
      4: [{ name: 'Reunification Day', timing: 'Apr 30', note: 'parades and fireworks over the Saigon River' }],
      9: [{ name: 'Mid-Autumn Festival', timing: 'full moon, Sep–early Oct', note: 'lantern lanes in Cholon’s Luong Nhu Hoc street' }],
    },
  },
  'Da Nang': {
    crowd: 'ossppppssoos',
    seasons: ['Cool, last wet-season showers', 'Dry season begins, mild', 'Warm dry spring', 'Warm dry — beach season opens', 'Hot dry beach season', 'Hot dry midsummer', 'Hot dry midsummer', 'Hot — late storms possible', 'Wet season & typhoon risk', 'Peak rains & typhoon season', 'Heavy rains, flood-prone', 'Wet season winding down'],
    best_months: ['March', 'April', 'May'],
    best_reason: 'warm dry beach weather before peak domestic summer and well before the Sep–Nov typhoon rains',
    top: [
      { name: 'My Khe Beach', why: '30 km of soft sand rated among Asia’s best' },
      { name: 'Ba Na Hills & Golden Bridge', why: 'the giant stone hands above the clouds' },
      { name: 'Marble Mountains', why: 'cave pagodas and city-to-sea panoramas' },
      { name: 'Dragon Bridge weekend fire show', why: 'it literally breathes fire, 9pm Sat–Sun' },
    ],
    gems: [
      { name: 'Nam O fishing village', why: 'sunrise nets and the original fish-sauce makers' },
      { name: 'Son Tra (Monkey Mountain)', why: 'red-shanked douc langurs in wild jungle 20 min from town' },
      { name: 'Han Market upstairs tailors', why: 'Hoi An tailoring speed at Da Nang prices' },
    ],
    adventures: [
      { name: 'Hai Van Pass by motorbike', why: 'the ocean-cloud pass Top Gear made famous' },
      { name: 'Son Tra peninsula jungle trails', why: 'hike or ride to the giant Lady Buddha and hidden coves' },
      { name: 'Bach Ma National Park (day trip)', why: 'waterfall-laced summit trail in a former French hill station' },
    ],
    festivals: {
      6: [{ name: 'Da Nang International Fireworks Festival', timing: 'weekends Jun–Jul', note: 'world-class pyrotechnics over the Han River' }],
      9: [{ name: 'Mid-Autumn Festival', timing: 'full moon, Sep–early Oct', note: 'lion dances along Bach Dang riverfront' }],
    },
  },
  'Hoi An': {
    crowd: 'osspppssooos',
    seasons: ['Cool, drying out', 'Dry season begins, mild', 'Warm dry spring', 'Warm dry spring', 'Hot dry season', 'Hot dry midsummer', 'Hot dry midsummer', 'Hot — late storms possible', 'Wet season & typhoon risk', 'Peak rains — old town can flood', 'Heavy rains, flood-prone', 'Wet season winding down'],
    best_months: ['February', 'March', 'April'],
    best_reason: 'dry golden weather, lantern light on the river, and the fields at their greenest',
    top: [
      { name: 'Ancient Town at dusk', why: 'UNESCO streets glowing with silk lanterns' },
      { name: 'Japanese Covered Bridge', why: '400-year-old symbol of the port’s trading past' },
      { name: 'An Bang Beach', why: 'laid-back sand 15 minutes by bicycle' },
      { name: 'Tra Que Vegetable Village', why: 'herb gardens, cooking classes, buffalo rides' },
    ],
    gems: [
      { name: 'Kim Bong carpentry village', why: 'boat-builders across the river, five minutes by ferry' },
      { name: 'Hoi An central market at 6am', why: 'the town before the tour buses — chefs shopping' },
      { name: 'Cam Kim island loop by bike', why: 'rice paddies, bamboo bridges, zero crowds' },
    ],
    adventures: [
      { name: 'Cham Islands snorkel & hike', why: 'marine-reserve reefs 45 minutes offshore (Mar–Aug seas)' },
      { name: 'Marble Mountains caves climb', why: 'shrine-filled grottoes and summit views toward Da Nang' },
      { name: 'My Son sanctuary by bicycle', why: 'ride paddy backroads to the jungle-wrapped Cham temples' },
    ],
    festivals: {
      1: [{ name: 'Full Moon Lantern Festival', timing: '14th of each lunar month', note: 'electric lights off, candle lanterns on the Thu Bon river — every month, check lunar dates' }],
      2: [{ name: 'Tet in the Ancient Town', timing: 'late Jan–mid Feb, lunar', note: 'flower markets and calligraphy streets' }],
      9: [{ name: 'Mid-Autumn Festival', timing: 'full moon, Sep–early Oct', note: 'the lantern town at its most photogenic' }],
    },
  },
  'Ha Long': {
    crowd: 'ssoosppposss',
    seasons: ['Cool dry winter, misty', 'Cool drizzle & fog', 'Mild spring, hazy', 'Warm spring, clearing', 'Hot — summer rains begin', 'Hot humid, storms', 'Peak rains & typhoon risk', 'Hot rainy, typhoon risk', 'Storms easing', 'Dry autumn, clear seas', 'Crisp dry autumn', 'Cool dry winter'],
    best_months: ['October', 'November', 'March', 'April'],
    best_reason: 'clear-enough skies and calm seas for cruising the karsts, minus summer’s domestic crowds and storms',
    top: [
      { name: 'Ha Long Bay overnight cruise', why: 'sleep among 1,600 limestone islands' },
      { name: 'Sung Sot (Surprise) Cave', why: 'cathedral-scale grotto on Bo Hon island' },
      { name: 'Ti Top Island viewpoint', why: 'the classic 360° bay panorama' },
      { name: 'Kayaking Luon Cave lagoon', why: 'paddle under a karst arch into a hidden bowl' },
    ],
    gems: [
      { name: 'Lan Ha Bay (via Cat Ba)', why: 'the same karst seascape with a fraction of the boats' },
      { name: 'Vung Vieng floating village', why: 'pearl farms and stilt life far from the marina' },
      { name: 'Bai Tu Long Bay', why: 'the quiet northeastern third most itineraries skip' },
    ],
    adventures: [
      { name: 'Cat Ba National Park — Ngu Lam peak', why: 'jungle ridge walk above the karst archipelago' },
      { name: 'Kayak the Lan Ha lagoons', why: 'paddle through arches into enclosed emerald bowls' },
      { name: 'Rock climbing on Cat Ba', why: 'deep-water solo over the bay with local guides' },
    ],
    festivals: {
      4: [{ name: 'Ha Long Carnival', timing: 'late Apr–early May', note: 'parades and beach concerts opening summer season' }],
    },
  },
  'Sapa': {
    crowd: 'oossspsspsoo',
    seasons: ['Cold foggy winter (frost possible)', 'Cold damp winter', 'Mild dry spring', 'Warm clear spring', 'Planting season — flooded terraces', 'Rainy summer', 'Peak summer rains', 'Rainy — terraces greenest', 'Harvest gold, clearing', 'Clear dry autumn', 'Cool crisp autumn', 'Cold winter begins'],
    best_months: ['September', 'October', 'March', 'April', 'May'],
    best_reason: 'terraces gold at harvest (Sep–Oct) or mirror-flooded at planting (May); winters are cold and fog-bound',
    top: [
      { name: 'Fansipan cable car', why: 'the “Roof of Indochina” at 3,143 m' },
      { name: 'Muong Hoa Valley trek', why: 'the classic terrace walk through Lao Chai and Ta Van' },
      { name: 'Cat Cat village', why: 'easy waterfall walk from town' },
      { name: 'Sapa market', why: 'H’mong and Red Dao textiles and street barbecue' },
    ],
    gems: [
      { name: 'Ta Phin village homestays', why: 'Red Dao herbal baths, far fewer trekkers' },
      { name: 'Y Linh Ho hamlet', why: 'the steepest, prettiest terrace amphitheatre' },
      { name: 'Bac Ha Sunday market (day trip)', why: 'the most colourful minority market in the north' },
    ],
    adventures: [
      { name: 'Fansipan summit trek (2 days)', why: 'earn the 3,143 m “Roof of Indochina” on foot instead of the cable car' },
      { name: 'Muong Hoa valley-to-valley trek', why: 'full-day terrace traverse with a village homestay night' },
      { name: 'Silver Waterfall & Tram Ton Pass', why: 'the highest road pass in Vietnam, gateway to cloud hikes' },
    ],
    festivals: {
      9: [{ name: 'Harvest season', timing: 'mid Sep–early Oct', note: 'not a festival but the event — terraces turn gold for ~3 weeks' }],
    },
  },
  'Taipei': {
    crowd: 'pssssoosspps',
    seasons: ['Cool damp winter', 'Cool damp winter', 'Mild spring', 'Warm spring', 'Plum rains begin', 'Plum-rain season, humid', 'Hot typhoon summer', 'Hot typhoon summer', 'Hot — typhoon tail risk', 'Warm dry autumn', 'Mild autumn', 'Cool winter drizzle'],
    best_months: ['October', 'November', 'December', 'March', 'April'],
    best_reason: 'comfortable temps and lower rain outside the sweltering typhoon summer',
    top: [
      { name: 'Taipei 101 & Xinyi district', why: 'the icon plus the city’s glossiest food courts' },
      { name: 'National Palace Museum', why: 'the world’s great Chinese-art collection' },
      { name: 'Shilin or Raohe Night Market', why: 'pepper buns, stinky tofu, neon appetite' },
      { name: 'Beitou hot springs', why: 'steaming public baths on the MRT line' },
      { name: 'Elephant Mountain sunset', why: 'the postcard 101 photo after a 20-minute climb' },
    ],
    gems: [
      { name: 'Dihua Street', why: 'Qing-era apothecaries turned indie tea and fabric shops' },
      { name: 'Treasure Hill Artist Village', why: 'hillside veterans’ settlement turned art warren' },
      { name: 'Jinguashi & Jiufen early morning', why: 'gold-rush mountain lanes before the tour buses' },
    ],
    adventures: [
      { name: 'Yangmingshan — Qixing main peak', why: 'volcanic fumaroles and silvergrass on Taipei’s rooftop' },
      { name: 'Teapot Mountain ridge', why: 'short scramble to the coast’s best gold-country panorama' },
      { name: 'Pingxi Crags (Xiaozi/Cimu)', why: 'ladder-and-chain mini-summits above the sky-lantern valley' },
    ],
    festivals: {
      2: [
        { name: 'Lunar New Year', timing: 'late Jan–mid Feb, lunar', note: 'Dihua Street market is the place to feel it' },
        { name: 'Taiwan Lantern Festival & Pingxi sky lanterns', timing: '15th day of lunar new year', note: 'thousands of wish-lanterns rising over Pingxi is unforgettable' },
      ],
      6: [{ name: 'Dragon Boat Festival', timing: 'lunar, late May–Jun', note: 'races on the Keelung River, zongzi everywhere' }],
      8: [{ name: 'Ghost Month', timing: 'lunar Jul, ~Aug', note: 'temple rituals and offerings; some locals avoid travel' }],
      9: [{ name: 'Mid-Autumn Festival', timing: 'full moon, Sep–early Oct', note: 'the whole city barbecues outdoors — join in' }],
    },
  },
  'Taichung': {
    crowd: 'sssssoosssps',
    seasons: ['Mild dry winter, sunny', 'Mild dry winter', 'Warm spring', 'Warm spring', 'Plum rains', 'Hot, plum rains', 'Hot summer, typhoon risk', 'Hot summer, typhoon risk', 'Hot — storms easing', 'Warm dry autumn', 'Mild dry autumn', 'Mild dry winter'],
    best_months: ['October', 'November', 'March', 'April'],
    best_reason: 'Taiwan’s sunniest big city is best when the plains cool down',
    top: [
      { name: 'Rainbow Village', why: 'a veteran painted his settlement into a comic dreamscape' },
      { name: 'National Taichung Theater', why: 'Toyo Ito’s cave-like architectural marvel' },
      { name: 'Fengjia Night Market', why: 'Taiwan’s biggest — invention lab of night-market food' },
      { name: 'Chun Shui Tang teahouse', why: 'birthplace of bubble tea; drink the original' },
    ],
    gems: [
      { name: 'Shenji New Village', why: 'retro civil-servant housing turned maker studios' },
      { name: 'Gaomei Wetlands at sunset', why: 'mirror flats, windmills and migratory birds' },
      { name: 'Dakeng trails no. 9–10', why: 'log-path ridge hikes locals do at dawn' },
    ],
    adventures: [
      { name: 'Xueshan (Snow Mountain) via Wuling', why: 'Taiwan’s second-highest summit — permits + 2 days' },
      { name: 'Dasyueshan forest road', why: 'high-mountain birding and sea-of-clouds sunsets' },
      { name: 'Guguan hot-spring trails', why: 'seven short gorge hikes, then soak in the springs' },
    ],
    festivals: {
      3: [{ name: 'Dajia Mazu Pilgrimage', timing: 'lunar Mar, ~Apr', note: 'nine days, 300 km, a million pilgrims — Taiwan’s biggest religious event departs from nearby Dajia' }],
    },
  },
  'Kaohsiung': {
    crowd: 'psssoooosssp',
    seasons: ['Warm dry winter', 'Warm dry winter', 'Warm dry spring', 'Hot — dry season ending', 'Hot, rains begin', 'Hot rainy season', 'Hot rainy, typhoon risk', 'Peak rains & typhoons', 'Hot rainy, typhoon risk', 'Warm, drying out', 'Warm dry season', 'Warm dry winter'],
    best_months: ['November', 'December', 'January', 'February'],
    best_reason: 'the tropical south stays warm and dry while the north shivers in drizzle',
    top: [
      { name: 'Pier-2 Art Center', why: 'harbor warehouses turned street-art playground' },
      { name: 'Lotus Pond & Dragon Tiger Pagodas', why: 'enter the dragon, exit the tiger — luck reversed' },
      { name: 'Fo Guang Shan Buddha Museum', why: 'monumental Buddhist complex, genuinely serene' },
      { name: 'Cijin Island by ferry', why: 'seafood street, black-sand beach, harbor sunsets' },
    ],
    gems: [
      { name: 'Yancheng old streets', why: 'the pre-war trading quarter with third-wave coffee' },
      { name: 'Weiwuying wetlands & arts center', why: 'the world’s largest single-roof theater beside birdlife' },
      { name: 'Meinong Hakka town (day trip)', why: 'paper umbrellas and butterfly valleys' },
    ],
    adventures: [
      { name: 'Shoushan (Monkey Mountain) trails', why: 'macaque-lined coastal ridge right behind the city' },
      { name: 'Maolin valley & Purple Butterfly hikes', why: 'gorge suspension bridges; millions of butterflies Dec–Feb' },
      { name: 'Xiaoliuqiu island snorkel', why: 'swim with green sea turtles, 30 min by ferry' },
    ],
    festivals: {
      2: [{ name: 'Kaohsiung Lantern Festival', timing: 'around lunar new year’s 15th day', note: 'light art along the Love River' }],
    },
  },
  'Tainan': {
    crowd: 'psssoooossss',
    seasons: ['Mild dry winter', 'Mild dry winter', 'Warm dry spring', 'Hot — dry season ending', 'Hot, rains begin', 'Hot rainy season', 'Hot rainy, typhoon risk', 'Peak rains & typhoons', 'Hot rainy, typhoon risk', 'Warm, drying out', 'Warm dry season', 'Mild dry winter'],
    best_months: ['November', 'December', 'January', 'February', 'March'],
    best_reason: 'cool dry months suit temple-lane walking in Taiwan’s oldest city',
    top: [
      { name: 'Anping Old Fort & Tree House', why: 'Dutch ramparts and a warehouse swallowed by banyans' },
      { name: 'Chihkan Tower', why: '17th-century heart of old Formosa' },
      { name: 'Shennong Street', why: 'the most atmospheric lantern-hung lane in Taiwan' },
      { name: 'Guohua Street food crawl', why: 'beef soup, milkfish, shrimp rolls — Tainan invented them' },
    ],
    gems: [
      { name: 'Sicao Green Tunnel', why: 'sampan ride through a mangrove cathedral' },
      { name: 'Bao-an temple ironwork gods', why: 'craftsman temples without a single tour group' },
      { name: 'Qigu salt mountain & lagoons', why: 'blinding-white salt fields and oyster shacks' },
    ],
    adventures: [
      { name: 'Guanziling Water-Fire Cave & mud springs', why: 'flames burning out of spring water, then a rare mud bath' },
      { name: 'Erliao sunrise ridge', why: 'sea-of-clouds over badland hills 40 minutes from town' },
      { name: 'Sicao lagoon kayak', why: 'paddle the mangrove channels past oyster farms' },
    ],
    festivals: {
      2: [{ name: 'Yanshui Beehive Fireworks', timing: 'lunar new year’s 14th–15th day', note: 'rockets fired INTO the crowd — Taiwan’s wildest festival; full protective gear required' }],
    },
  },
  'Hualien': {
    crowd: 'osssspposoos',
    seasons: ['Mild winter drizzle', 'Mild damp winter', 'Warm spring', 'Warm spring', 'Plum rains', 'Hot humid — storms build', 'Typhoon season', 'Peak typhoon season', 'Typhoon risk, rainy', 'Warm autumn, clearing', 'Mild dry autumn', 'Mild winter'],
    best_months: ['October', 'November', 'March', 'April', 'May'],
    best_reason: 'stable weather for Taroko’s marble gorges outside typhoon season',
    top: [
      { name: 'Taroko Gorge', why: 'marble canyon walls 500 m high (check trail reopenings)' },
      { name: 'Qingshui Cliffs', why: 'green mountains falling a kilometre into Pacific blue' },
      { name: 'Qixingtan Beach', why: 'pebble crescent with mountain backdrop' },
      { name: 'Dongdamen Night Market', why: 'indigenous Amis dishes beside Taiwanese classics' },
    ],
    gems: [
      { name: 'Yuli & Walami Trail', why: 'the gentle start of the old Japanese cross-island route' },
      { name: 'Mataian wetlands', why: 'Amis fish-trap ecology and palusami-style feasts' },
      { name: 'Highway 11 coast by scooter', why: 'terrace cafés over the Pacific every few km' },
    ],
    adventures: [
      { name: 'Zhuilu Old Road', why: 'the vertigo ledge 500 m above Taroko’s gorge floor (permit + reopening status)' },
      { name: 'Shakadang Trail', why: 'sapphire-water canyon walk, gentle and stunning' },
      { name: 'Jinzun sea kayaking at dawn', why: 'paddle beneath the Qingshui-style cliffs as the sun rises' },
    ],
    festivals: {
      7: [{ name: 'Amis Harvest Festival', timing: 'Jul–Aug, village-by-village', note: 'indigenous song-and-dance gatherings; ask locally which villages welcome visitors' }],
    },
  },
  'Hong Kong': {
    crowd: 'ppsssooosspp',
    seasons: ['Cool dry winter', 'Cool — humidity rising', 'Warm humid spring, fog', 'Warm humid spring', 'Hot, rains begin', 'Hot wet summer', 'Hot wet, typhoon season', 'Peak heat & typhoon risk', 'Hot, typhoon risk', 'Sunny dry autumn', 'Crisp dry autumn', 'Cool dry winter'],
    best_months: ['October', 'November', 'December'],
    best_reason: 'crisp blue-sky days after the humid typhoon summer — hiking and harbour views at their best',
    top: [
      { name: 'Victoria Peak at dusk', why: 'the skyline igniting below you' },
      { name: 'Star Ferry crossing', why: 'the world’s best-value harbour cruise' },
      { name: 'Big Buddha & Ngong Ping 360', why: 'cable car over country park to Lantau’s giant Buddha' },
      { name: 'Temple Street Night Market', why: 'fortune tellers, clay-pot rice, neon nostalgia' },
      { name: 'Dragon’s Back hike', why: 'ridge-to-beach trail inside city limits' },
    ],
    gems: [
      { name: 'Yick Cheong “Monster Building”', why: 'the stacked-flat canyon of Quarry Bay' },
      { name: 'Tai O stilt village', why: 'fishing families and pink dolphins on Lantau’s far edge' },
      { name: 'Sham Shui Po fabric & gadget streets', why: 'the working-class city tourists miss' },
      { name: 'Po Toi island weekend ferry', why: 'seafood terraces and granite headlands' },
    ],
    adventures: [
      { name: 'Lion Rock summit', why: 'the city’s definitive skyline-through-the-clouds hike' },
      { name: 'Lantau Peak for sunrise', why: 'watch dawn hit the Big Buddha from 934 m' },
      { name: 'MacLehose Trail section 2', why: 'Sai Kung’s wild beaches — Hong Kong’s best coastline on foot' },
      { name: 'Tai Mo Shan', why: 'the territory’s highest point, waterfalls on the way down' },
    ],
    festivals: {
      2: [{ name: 'Chinese New Year', timing: 'late Jan–mid Feb, lunar', note: 'night parade, flower markets, harbour fireworks' }],
      4: [{ name: 'Hong Kong Sevens', timing: 'late Mar–early Apr', note: 'the city’s biggest party disguised as rugby' }],
      5: [{ name: 'Cheung Chau Bun Festival', timing: 'lunar, ~May', note: 'bun-scrambling towers on a car-free island' }],
      6: [{ name: 'Dragon Boat Festival', timing: 'lunar, Jun', note: 'races at Stanley and Aberdeen' }],
      9: [{ name: 'Mid-Autumn Festival & Tai Hang Fire Dragon', timing: 'full moon, Sep–early Oct', note: 'a 67-metre incense dragon dances through Tai Hang' }],
    },
  },
  'Almaty': {
    crowd: 'psoospppsoos',
    seasons: ['Snowy winter (ski season)', 'Snowy winter (ski season)', 'Thaw — spring showers', 'Green spring, blossom', 'Mild spring, showery', 'Warm summer', 'Hot summer (peak)', 'Hot dry summer', 'Golden autumn', 'Crisp autumn', 'First snows', 'Snowy winter (ski season)'],
    best_months: ['May', 'June', 'September', 'October'],
    best_reason: 'green foothills or golden steppe-autumn — plus a genuine ski-season second peak (Dec–Feb)',
    top: [
      { name: 'Shymbulak ski resort & Medeu', why: 'cable car from city to 3,200 m; skate the world’s highest rink' },
      { name: 'Big Almaty Lake', why: 'impossible turquoise bowl at 2,511 m' },
      { name: 'Zenkov Cathedral & Panfilov Park', why: 'a wooden cathedral built without nails' },
      { name: 'Green Bazaar', why: 'horse sausage, kurt, mountains of dried fruit' },
      { name: 'Charyn Canyon (day trip)', why: 'Kazakhstan’s Grand Canyon in miniature' },
    ],
    gems: [
      { name: 'Kok-Tobe by cable car at night', why: 'city lights with a Beatles statue' },
      { name: 'Arasan Baths', why: 'Soviet-brutalist banya — steam like a local' },
      { name: 'Turgen Gorge waterfalls', why: 'picnic valleys locals prefer to Charyn' },
    ],
    adventures: [
      { name: 'Furmanov Peak day hike', why: '3,053 m straight from the Medeu bus stop — Almaty’s classic' },
      { name: 'Kolsai & Kaindy lakes (day trip)', why: 'alpine lakes and a sunken spruce forest from a 1911 quake' },
      { name: 'Shymbulak ski season', why: 'Dec–Mar powder 25 minutes from downtown' },
    ],
    festivals: {
      3: [{ name: 'Nauryz', timing: 'Mar 21–23', note: 'Kazakh new year — yurts, kokpar horse games and nauryz-kozhe in every park' }],
    },
  },
  'Astana': {
    crowd: 'ooosspppsoos',
    seasons: ['Deep freeze (−20 to −30°C)', 'Deep freeze, blizzards', 'Late-winter thaw begins', 'Muddy spring thaw', 'Cool spring, greening', 'Warm steppe summer', 'Warm summer (peak)', 'Warm summer, cooling late', 'Brief crisp autumn', 'Cold autumn, first snow', 'Winter sets in', 'Deep freeze'],
    best_months: ['June', 'July', 'August'],
    best_reason: 'the steppe capital only makes sense in summer — winters hit −30°C with knife winds',
    top: [
      { name: 'Bayterek Tower', why: 'the golden-egg symbol of the new capital' },
      { name: 'Khan Shatyr', why: 'Norman Foster’s giant tent with a beach on top' },
      { name: 'Hazrat Sultan Mosque', why: 'Central Asia’s largest, blinding white and gold' },
      { name: 'Nur-Astana & the Left Bank walk', why: 'the full sci-fi skyline in one stroll' },
    ],
    gems: [
      { name: 'ALZHIR memorial (day trip)', why: 'the Stalinist camp for “wives of traitors” — sobering, important' },
      { name: 'Korgalzhyn flamingo lakes', why: 'the world’s northernmost flamingos, 2 hrs away' },
      { name: 'Soviet-era right bank', why: 'the old Tselinograd town the towers replaced' },
    ],
    adventures: [
      { name: 'Burabay (Borovoe) National Park', why: 'granite crags and pine lakes — the “Kazakh Switzerland”, 3 hrs north' },
      { name: 'Steppe horse riding', why: 'ride the endless flat gold that made the nomad world' },
    ],
    festivals: {
      7: [{ name: 'Astana Day', timing: 'Jul 6', note: 'concerts and fireworks across the Left Bank' }],
      3: [{ name: 'Nauryz', timing: 'Mar 21–23', note: 'spring new year celebrated even in the snow' }],
    },
  },
  'Shymkent': {
    crowd: 'oossppssssoo',
    seasons: ['Chilly winter', 'Chilly winter, late thaw', 'Spring bloom begins', 'Warm spring — wild tulips', 'Warm late spring', 'Hot dry summer', 'Scorching summer', 'Scorching dry summer', 'Warm harvest autumn', 'Mild golden autumn', 'Cool rainy autumn', 'Chilly winter'],
    best_months: ['April', 'May', 'September', 'October'],
    best_reason: 'spring blossom or autumn harvest in Kazakhstan’s garden south; summers scorch',
    top: [
      { name: 'Turkistan & Yasawi Mausoleum (day trip)', why: 'Timur-built UNESCO masterpiece, the country’s holiest site' },
      { name: 'Shymkent Central Bazaar', why: 'Silk Road trading energy, unfiltered' },
      { name: 'Sayram ancient town', why: '3,000-year-old settlement absorbed into the suburbs' },
      { name: 'Independence Park & Walk of Fame', why: 'the city’s green evening promenade' },
    ],
    gems: [
      { name: 'Aksu-Zhabagly reserve', why: 'Central Asia’s oldest nature reserve — tulips in the wild (Apr–May)' },
      { name: 'Sauran fortress ruins', why: 'desert walls nobody visits en route to Turkistan' },
    ],
    adventures: [
      { name: 'Sayram-Ugam National Park treks', why: 'juniper valleys under 4,000 m peaks, homestay villages' },
      { name: 'Aksu Canyon rim walk', why: 'a 500 m-deep green gash in the steppe, wild tulips in spring' },
      { name: 'Kazygurt Mountain', why: 'the local “Ararat” — legend says the Ark grounded here' },
    ],
    festivals: {
      3: [{ name: 'Nauryz', timing: 'Mar 21–23', note: 'the south celebrates hardest — horse games and street plov' }],
    },
  },
  'Tashkent': {
    crowd: 'oosspposssoo',
    seasons: ['Cold winter', 'Cold winter, late thaw', 'Spring bloom, showery', 'Warm green spring', 'Warm, drying out', 'Hot dry summer', 'Scorching “chilla” heat (40°C+)', 'Scorching dry summer', 'Warm grape-harvest autumn', 'Mild golden autumn', 'Cool cloudy autumn', 'Cold winter'],
    best_months: ['April', 'May', 'September', 'October'],
    best_reason: 'blossom or grape-harvest weather; July–August bakes past 40°C',
    top: [
      { name: 'Chorsu Bazaar', why: 'turquoise-domed food hall of the whole Fergana harvest' },
      { name: 'Hazrati Imam Complex', why: 'home of the world’s oldest Quran' },
      { name: 'Tashkent Metro', why: 'each station a Soviet-cosmic art gallery — bring a camera, it’s legal now' },
      { name: 'Amir Timur Square & museums', why: 'the national story in one block' },
    ],
    gems: [
      { name: 'Yangiobod flea market', why: 'Soviet cameras, medals and samovars by the acre (weekends)' },
      { name: 'Plov Centre (Besh Qozon)', why: 'watch cauldrons the size of hot tubs feed a city' },
      { name: 'Chimgan mountains (day trip)', why: 'Tashkent’s alpine escape, 90 minutes away' },
    ],
    adventures: [
      { name: 'Greater Chimgan ascent', why: 'guided 3,309 m summit day in the western Tian Shan' },
      { name: 'Beldersay ridge & cable car hikes', why: 'walk the grassy crest lines above Charvak’s turquoise' },
      { name: 'Charvak reservoir watersports', why: 'kayaks and paddleboards under mountain walls all summer' },
    ],
    festivals: {
      3: [{ name: 'Navruz', timing: 'Mar 21', note: 'sumalak stirred all night in courtyards across the city' }],
      9: [{ name: 'Independence Day', timing: 'Sep 1', note: 'concerts and lights along the boulevards' }],
    },
  },
  'Samarkand': {
    crowd: 'oosppossppoo',
    seasons: ['Cold winter', 'Cold winter, late thaw', 'Spring bloom, showery', 'Warm green spring', 'Warm late spring', 'Hot dry summer', 'Scorching summer (40°C+)', 'Scorching dry summer', 'Warm harvest autumn', 'Mild golden autumn', 'Cool autumn', 'Cold winter'],
    best_months: ['April', 'May', 'September', 'October'],
    best_reason: 'Registan blue against spring gardens or autumn gold — and bearable walking heat',
    top: [
      { name: 'The Registan', why: 'three madrasahs forming Central Asia’s most stunning square' },
      { name: 'Shah-i-Zinda', why: 'an avenue of tombs in every shade of blue that exists' },
      { name: 'Gur-e-Amir', why: 'Tamerlane’s surprisingly intimate mausoleum' },
      { name: 'Bibi-Khanym Mosque & Siyob Bazaar', why: 'monumental ruin beside melon mountains' },
      { name: 'Ulugh Beg Observatory', why: 'a sultan-astronomer’s giant sextant, 1420s' },
    ],
    gems: [
      { name: 'Konigil paper mill', why: 'silk paper made the 8th-century way by watermill' },
      { name: 'Registan at 6am', why: 'you, the pigeons, and the turquoise — no coaches until 9' },
      { name: 'Urgut Sunday bazaar', why: 'suzani embroidery hunting with zero middlemen' },
    ],
    adventures: [
      { name: 'Amankutan gorge hikes', why: 'walnut-forest trails in the Zarafshan foothills, 40 min away' },
      { name: 'Agalyk village day-hike', why: 'shepherd paths and petroglyph boulders above orchard hamlets' },
    ],
    festivals: {
      3: [{ name: 'Navruz', timing: 'Mar 21', note: 'games and plov in front of the Registan' }],
      8: [{ name: 'Sharq Taronalari music festival', timing: 'late Aug, biennial (odd years)', note: 'world musicians performing ON the Registan' }],
    },
  },
  'Bukhara': {
    crowd: 'oosppossppoo',
    seasons: ['Cold desert winter', 'Cold winter, late thaw', 'Mild spring bloom', 'Warm spring', 'Hot late spring', 'Hot dry summer', 'Furnace heat (40°C+)', 'Furnace dry summer', 'Hot early autumn', 'Mild golden autumn', 'Cool autumn', 'Cold desert winter'],
    best_months: ['April', 'May', 'September', 'October'],
    best_reason: 'the desert oasis is gentle in spring and autumn; summer is a furnace',
    top: [
      { name: 'Poi Kalyan complex', why: 'the minaret even Genghis Khan spared' },
      { name: 'Lyab-i Hauz', why: 'plane-tree pond square, the city’s living room' },
      { name: 'Ark Fortress', why: 'two millennia of emirs behind massive mud walls' },
      { name: 'Trading domes & carpet ateliers', why: 'shop the actual Silk Road crossroads' },
    ],
    gems: [
      { name: 'Chor Minor', why: 'the quirky four-towered gatehouse hiding in backstreets' },
      { name: 'Sitorai Mokhi-Khosa', why: 'the last emir’s summer palace of mirrored kitsch' },
      { name: 'Hammam Bozori Kord', why: '16th-century bathhouse still steaming daily' },
    ],
    adventures: [
      { name: 'Kyzylkum camel trek & yurt night', why: 'ride into the red desert and sleep under raw stars' },
      { name: 'Aydarkul lake swim', why: 'an accidental Soviet sea on the desert’s edge' },
      { name: 'Nuratau mountains homestay trek', why: 'village-to-village walking with wild pistachio slopes' },
    ],
    festivals: {
      3: [{ name: 'Navruz', timing: 'Mar 21', note: 'street feasts under the trading domes' }],
      5: [{ name: 'Silk and Spices Festival', timing: 'late May–early Jun', note: 'artisans and dancers fill the old town' }],
    },
  },
  'Khiva': {
    crowd: 'oospposssooo',
    seasons: ['Cold desert winter (freezing)', 'Cold winter', 'Chilly early spring', 'Warm spring', 'Hot late spring', 'Very hot dry summer', 'Furnace heat (40°C+)', 'Furnace dry summer', 'Hot early autumn', 'Mild golden autumn', 'Cool autumn', 'Cold desert winter'],
    best_months: ['April', 'May', 'September', 'October'],
    best_reason: 'the walled museum-city glows at golden hour in the mild seasons; summers exceed 40°C',
    top: [
      { name: 'Itchan Kala walls at sunset', why: 'walk the ramparts of a complete medieval city' },
      { name: 'Kalta Minor', why: 'the fat, gloriously unfinished turquoise minaret' },
      { name: 'Juma Mosque', why: 'a forest of 213 carved wooden columns' },
      { name: 'Islam Khodja minaret climb', why: 'desert-to-oasis panorama from the tallest tower' },
    ],
    gems: [
      { name: 'Dishan Kala outer town', why: 'where actual Khivans live — bread ovens and weddings' },
      { name: 'Elliq Qala desert fortresses (day trip)', why: 'crumbling Khorezm citadels in the Kyzylkum' },
    ],
    adventures: [
      { name: 'Ayaz-Kala fortress camel camp', why: 'sunset from 2,000-year-old walls, yurt dinner below' },
      { name: 'Sultan Uvays desert mountains', why: 'pilgrim ridge between the Kyzylkum and the Amu Darya' },
    ],
    festivals: {
      3: [{ name: 'Navruz', timing: 'Mar 21', note: 'tightrope walkers and wrestling inside the walls' }],
      8: [{ name: 'Melon festival', timing: 'Aug', note: 'Khorezm’s legendary melons get their own party' }],
    },
  },
  'Bishkek': {
    crowd: 'oossspppssoo',
    seasons: ['Snowy winter', 'Snowy winter', 'Spring thaw, showery', 'Green spring (wettest month)', 'Mild spring, showery', 'Warm summer', 'Hot summer', 'Hot dry summer', 'Clear golden autumn', 'Crisp autumn', 'First snows', 'Snowy winter'],
    best_months: ['June', 'July', 'August', 'September'],
    best_reason: 'gateway weather for the mountains — the city itself is leafy and mild while the peaks open up',
    top: [
      { name: 'Ala-Too Square', why: 'flag-raising ceremonies beneath Manas on horseback' },
      { name: 'Osh Bazaar', why: 'kalpak hats, korut balls and horse-milk culture' },
      { name: 'Ala Archa National Park', why: 'proper alpine gorge 40 minutes from downtown' },
      { name: 'State History Museum', why: 'freshly renovated Soviet-to-nomad story' },
    ],
    gems: [
      { name: 'Soviet mosaic hunting', why: 'the city is an open-air museum of them — start on Chuy Ave' },
      { name: 'Burana Tower (day trip)', why: 'leaning 11th-century minaret amid balbal stone warriors' },
      { name: 'Chunkurchak valley yurts', why: 'weekend kumis and horse rides without tourists' },
    ],
    adventures: [
      { name: 'Ala Archa — Ak-Sai waterfall & glacier trail', why: 'from picnic path to alpinist basecamp in one valley' },
      { name: 'Kegeti gorge & waterfall', why: 'quieter canyon hike with a 20 m cascade' },
      { name: 'Alamedin valley hot walk', why: 'meadow trail to warm springs under 4,000 m walls' },
    ],
    festivals: {
      3: [{ name: 'Nooruz', timing: 'Mar 21', note: 'horse games in the hippodrome, sumolok in the squares' }],
      8: [{ name: 'Independence Day', timing: 'Aug 31', note: 'concerts on Ala-Too Square' }],
    },
  },
  'Karakol': {
    crowd: 'osooospppsoo',
    seasons: ['Snowy winter (ski season)', 'Snowy winter (ski season)', 'Late ski season, thaw', 'Muddy spring', 'Green valleys, snowy passes', 'Alpine summer begins', 'Trekking season — passes open', 'Peak trekking season', 'Golden autumn, passes closing', 'Cold autumn, first snow', 'Winter sets in', 'Snowy winter (ski season)'],
    best_months: ['July', 'August', 'September'],
    best_reason: 'the trekking window — Ala-Kul and the Terskey Alatau passes are snow-free',
    top: [
      { name: 'Ala-Kul lake trek', why: 'the turquoise 3,560 m lake every hiker comes for' },
      { name: 'Jeti-Oguz “Seven Bulls” cliffs', why: 'red sandstone walls and yurt-camp meadows' },
      { name: 'Dungan Mosque', why: 'a Chinese wooden temple built without nails — for Muslims' },
      { name: 'Holy Trinity Orthodox Cathedral', why: 'tsarist timber church survived as a stable and dance hall' },
    ],
    gems: [
      { name: 'Sunday animal market at dawn', why: 'sheep negotiations from truck beds — go before 8am' },
      { name: 'Ashlan-fu alley', why: 'the cold spicy Dungan noodle bowl for ~$1' },
      { name: 'Altyn Arashan hot springs', why: 'soak at 2,600 m after the walk in' },
    ],
    adventures: [
      { name: 'Ala-Kul pass loop (2–3 days)', why: 'Karakol valley → 3,860 m pass → Altyn Arashan springs — the classic' },
      { name: 'Boz-Uchuk lakes', why: 'twin alpine tarns with far fewer boots than Ala-Kul' },
      { name: 'Karakol Ski Base', why: 'Dec–Mar tree-line powder at bargain lift prices' },
    ],
    festivals: {
      7: [{ name: 'Yurt & eagle-hunting demos', timing: 'Jul–Aug, various', note: 'community tourism days around Issyk-Kul’s south shore' }],
    },
  },
  'Osh': {
    crowd: 'oosspppsssoo',
    seasons: ['Cold winter', 'Cold winter', 'Spring bloom', 'Warm green spring', 'Warm late spring', 'Hot dry summer', 'Scorching valley summer', 'Scorching dry summer', 'Warm harvest autumn', 'Mild autumn', 'Cool autumn', 'Cold winter'],
    best_months: ['May', 'June', 'September', 'October'],
    best_reason: 'Fergana valley heat is friendliest in late spring and early autumn',
    top: [
      { name: 'Sulaiman-Too Sacred Mountain', why: 'UNESCO pilgrimage rock rising from the city centre' },
      { name: 'Jayma Bazaar', why: '2,000 years old and still the valley’s trading heart' },
      { name: 'Silver Age & Lenin statue', why: 'one of the largest Lenins still standing' },
    ],
    gems: [
      { name: 'Babur’s house on the mountain', why: 'the Mughal founder’s teenage hermitage' },
      { name: 'Chil-Ustun caves (day trip)', why: 'karst caverns almost nobody visits' },
      { name: 'Uzgen minaret & mausoleums', why: 'Karakhanid brickwork an hour away' },
    ],
    adventures: [
      { name: 'Alay valley & Tulpar-Kul lake', why: 'yurt camps staring straight at 7,134 m Peak Lenin' },
      { name: 'Abshir-Ata waterfall', why: 'a spring bursting from a cliff face, picnic valley below' },
      { name: 'Kyrgyz-Ata National Park', why: 'juniper alpine valley with shepherd yurts, 40 km out' },
    ],
    festivals: {
      3: [{ name: 'Nooruz', timing: 'Mar 21', note: 'the valley’s biggest sumolok cauldrons' }],
    },
  },
  'Issyk-Kul (Cholpon-Ata)': {
    crowd: 'oooossppsooo',
    seasons: ['Cold winter (the lake never freezes)', 'Cold winter', 'Chilly early spring', 'Cool spring', 'Mild — hills greening', 'Warming, lake still cool', 'Beach season', 'Peak beach season', 'Warm days, crisp nights', 'Golden autumn', 'Cold and quiet', 'Cold winter'],
    best_months: ['July', 'August'],
    best_reason: 'the “warm lake” beach season — alpine swimming ringed by 4,000 m peaks',
    top: [
      { name: 'Issyk-Kul north-shore beaches', why: 'a sea that never freezes at 1,607 m altitude' },
      { name: 'Petroglyph open-air museum', why: 'Bronze-Age ibex carvings scattered over a boulder field' },
      { name: 'Ruh Ordo cultural complex', why: 'five faiths, one lakeside sculpture park' },
      { name: 'Grigoriev & Semenov gorges', why: 'twin fir-forest valleys behind the resort strip' },
    ],
    gems: [
      { name: 'South shore (Bokonbayevo)', why: 'eagle hunters, red canyons like Skazka, no crowds' },
      { name: 'Sunken Silk Road settlements', why: 'dive or boat over medieval ruins beneath the lake' },
    ],
    adventures: [
      { name: 'Grigoriev–Semenov gorge horse trek', why: 'ride fir valleys between yurt camps above the north shore' },
      { name: 'Konorchek red canyons', why: 'badland slot-canyon hike to eroded towers (dry months)' },
      { name: 'Skazka (Fairy Tale) Canyon', why: 'walk-through Mars on the quiet south shore' },
    ],
    festivals: {
      9: [{ name: 'World Nomad Games heritage', timing: 'Sep, biennial (host rotates)', note: 'born here — kok-boru and eagle contests when hosted; smaller ethno-festivals most summers' }],
    },
  },
  'Tokyo': {
    crowd: 'spppsospospp',
    seasons: ['Cold dry winter, clear skies', 'Cold, plum blossoms late', 'Mild — cherry blossoms late Mar', 'Warm spring (sakura → fresh green)', 'Warm, pleasant', 'Rainy season (tsuyu)', 'Hot humid summer', 'Peak heat & humidity, typhoon risk', 'Hot, typhoon risk', 'Warm autumn, clearing', 'Cool — autumn leaves late Nov', 'Cold dry winter'],
    best_months: ['March', 'April', 'October', 'November'],
    best_reason: 'cherry blossoms (late Mar–early Apr) or crisp foliage weather — between the muggy rainy season and typhoons',
    top: [
      { name: 'Shibuya Crossing & Center Gai', why: 'the world’s busiest scramble, best from above at dusk' },
      { name: 'Senso-ji Temple, Asakusa', why: 'Tokyo’s oldest temple behind the great Kaminarimon lantern' },
      { name: 'Meiji Jingu & Harajuku', why: 'forest shrine calm beside teen-fashion chaos' },
      { name: 'teamLab Planets', why: 'wade-through digital art you’ll never forget' },
      { name: 'Tsukiji Outer Market', why: 'knife shops and the best breakfast sushi of your life' },
    ],
    gems: [
      { name: 'Yanaka old town', why: 'the shitamachi Tokyo that survived — temples, cats, snack streets' },
      { name: 'Golden Gai & Omoide Yokocho', why: 'six-seat bars in lantern alleys, go after 9pm' },
      { name: 'Shimokitazawa', why: 'vintage-shop village the guidebooks underrate' },
      { name: 'Todoroki Valley', why: 'a jungle ravine hidden inside the city grid' },
    ],
    adventures: [
      { name: 'Mount Takao', why: 'temple trail summit with Fuji views, 50 min from Shinjuku' },
      { name: 'Mount Fuji (Jul–early Sep)', why: 'climb Japan’s icon overnight for sunrise — official season only' },
      { name: 'Okutama valley hikes', why: 'river gorges and sake breweries on Tokyo’s wild western edge' },
    ],
    festivals: {
      3: [{ name: 'Cherry blossom season', timing: 'late Mar–early Apr', note: 'hanami picnics in Ueno and along the Meguro River' }],
      5: [{ name: 'Sanja Matsuri', timing: '3rd weekend of May', note: 'Asakusa’s rowdiest shrine festival — 100+ portable shrines' }],
      7: [{ name: 'Sumida River Fireworks', timing: 'last Sat of Jul', note: '20,000 fireworks over Asakusa; stake a spot early' }],
      11: [{ name: 'Autumn leaves (koyo)', timing: 'mid Nov–early Dec', note: 'ginkgo gold at Meiji Jingu Gaien, maples at Rikugien' }],
    },
  },
  'Kyoto': {
    crowd: 'ospppsosoppp',
    seasons: ['Cold winter, occasional snow temples', 'Cold, plum blossoms', 'Mild — sakura begins late Mar', 'Cherry blossom peak, warm', 'Warm, fresh green', 'Rainy season (tsuyu)', 'Hot humid (Gion Matsuri month)', 'Peak heat & humidity', 'Hot, typhoon risk', 'Warm autumn', 'Autumn foliage peak, cool', 'Cold winter'],
    best_months: ['April', 'November', 'October', 'March'],
    best_reason: 'sakura in early April and Japan’s most famous autumn foliage in November — book far ahead for both',
    top: [
      { name: 'Fushimi Inari Shrine', why: 'ten thousand vermilion gates up a mountain — go at dawn' },
      { name: 'Kinkaku-ji (Golden Pavilion)', why: 'the gold-leaf icon on its mirror pond' },
      { name: 'Arashiyama bamboo grove & river', why: 'bamboo light, monkeys, and boat rides' },
      { name: 'Kiyomizu-dera & Higashiyama lanes', why: 'wooden veranda views over a preserved pilgrim town' },
      { name: 'Gion at dusk', why: 'geiko district of teahouses and lantern light' },
    ],
    gems: [
      { name: 'Philosopher’s Path at 7am', why: 'canal-side stroll before the crowds, temple cats included' },
      { name: 'Kurama to Kibune hike', why: 'mountain temples and riverside dining platforms' },
      { name: 'Fushimi sake district', why: 'canal warehouses and tastings, 15 min south' },
      { name: 'Daitoku-ji sub-temples', why: 'zen gardens with a tenth of Ryoan-ji’s visitors' },
    ],
    adventures: [
      { name: 'Kurama-dera to Kibune trail', why: 'the classic mountain-shrine traverse north of the city' },
      { name: 'Mount Hiei', why: 'cable car or hike to the monastery that shaped Japan' },
      { name: 'Hozugawa river boat + Sagano railway', why: 'gorge rapids down, scenic train back' },
    ],
    festivals: {
      4: [{ name: 'Cherry blossom season', timing: 'late Mar–mid Apr', note: 'Maruyama Park and the Philosopher’s Path at peak' }],
      7: [{ name: 'Gion Matsuri', timing: 'all July, grand parades Jul 17 & 24', note: 'Japan’s most famous festival — giant floats and evening street parties' }],
      8: [{ name: 'Gozan no Okuribi', timing: 'Aug 16', note: 'giant fire kanji lit on five mountains' }],
      10: [{ name: 'Jidai Matsuri', timing: 'Oct 22', note: 'a costume parade through 1,000 years of history' }],
      11: [{ name: 'Autumn illuminations', timing: 'mid Nov–early Dec', note: 'night-lit maples at Kiyomizu-dera and Eikando' }],
    },
  },
  'Osaka': {
    crowd: 'sspppsosospp',
    seasons: ['Cold dry winter', 'Cold, plum blossoms', 'Mild — sakura late Mar', 'Cherry blossom, warm', 'Warm, pleasant', 'Rainy season (tsuyu)', 'Hot humid summer', 'Peak heat, typhoon risk', 'Hot, typhoon risk', 'Warm autumn', 'Cool, autumn leaves', 'Cold dry winter'],
    best_months: ['March', 'April', 'October', 'November'],
    best_reason: 'the eating city is best in blossom or foliage weather; summer is a humidity wall',
    top: [
      { name: 'Dotonbori at night', why: 'neon canyon of crab signs and takoyaki queues' },
      { name: 'Osaka Castle & park', why: 'the gold-trimmed keep above 600 cherry trees' },
      { name: 'Kuromon Market', why: '“Osaka’s kitchen” — eat your way end to end' },
      { name: 'Universal Studios Japan', why: 'Super Nintendo World needs a timed entry — plan ahead' },
      { name: 'Umeda Sky Building', why: 'floating garden observatory at sunset' },
    ],
    gems: [
      { name: 'Shinsekai & Janjan Yokocho', why: 'retro 1912 quarter of kushikatsu and pinball parlors' },
      { name: 'Nakazakicho', why: 'wooden lanes turned indie café village, minutes from Umeda' },
      { name: 'Sumiyoshi Taisha', why: 'shrine architecture older than Buddhism in Japan, locals only' },
    ],
    adventures: [
      { name: 'Minoo Falls trail', why: 'waterfall gorge with maple tempura, 30 min north' },
      { name: 'Mount Kongo', why: 'Osaka’s highest peak — locals climb it a thousand times' },
      { name: 'Koyasan (day trip)', why: 'sleep-in-a-monastery mountain of 100 temples, 90 min away' },
    ],
    festivals: {
      4: [{ name: 'Cherry blossom season', timing: 'late Mar–mid Apr', note: 'Kema Sakuranomiya park’s riverside tunnel of blossoms' }],
      7: [{ name: 'Tenjin Matsuri', timing: 'Jul 24–25', note: 'one of Japan’s top three festivals — river procession + fireworks' }],
      9: [{ name: 'Kishiwada Danjiri Matsuri', timing: 'mid Sep', note: 'four-ton wooden floats pulled at sprint speed around corners' }],
    },
  },
  'Bangkok': {
    crowd: 'ppsoooooosss',
    seasons: ['Cool season — peak comfort', 'Warming, dry', 'Hot season begins', 'Hottest month (Songkran)', 'Very hot, rains begin', 'Rainy season', 'Rainy season', 'Rainy season', 'Peak rains', 'Heavy rains easing', 'Cooling, drying out', 'Cool season — peak comfort'],
    best_months: ['November', 'December', 'January', 'February'],
    best_reason: 'the “cool” dry season — blue skies and bearable heat before the March–May furnace and June–October rains',
    top: [
      { name: 'Grand Palace & Wat Phra Kaew', why: 'Thailand’s glittering royal heart — dress modestly' },
      { name: 'Wat Pho & Wat Arun', why: 'the reclining Buddha, then cross the river for sunset' },
      { name: 'Chatuchak Weekend Market', why: '15,000 stalls; go early, follow your nose' },
      { name: 'Chao Phraya by public ferry', why: 'the best city tour costs pennies' },
      { name: 'Chinatown (Yaowarat) at night', why: 'the best street-food strip in Asia' },
    ],
    gems: [
      { name: 'Talad Noi', why: 'street-art riverside quarter of machine shops and cafés' },
      { name: 'Bang Krachao', why: '“Bangkok’s green lung” — jungle bike loop across the river' },
      { name: 'Nang Loeng market', why: 'century-old snack market with zero tour groups' },
    ],
    adventures: [
      { name: 'Bang Krachao jungle cycling', why: 'elevated paths through mangrove jungle inside the city' },
      { name: 'Khao Yai National Park (day trip)', why: 'wild elephants and waterfalls, 2.5 hrs away' },
      { name: 'Amphawa floating market & firefly boats', why: 'evening canal life beyond the tourist circuits' },
    ],
    festivals: {
      4: [{ name: 'Songkran', timing: 'Apr 13–15', note: 'the world’s biggest water fight — you WILL get soaked' }],
      11: [{ name: 'Loy Krathong', timing: 'full moon of Nov', note: 'candle-lit floats on every canal and the river' }],
      12: [{ name: 'New Year countdowns', timing: 'Dec 31', note: 'riverside fireworks at ICONSIAM and CentralWorld' }],
    },
  },
  'Chiang Mai': {
    crowd: 'ppsoooooossp',
    seasons: ['Cool season, crisp mornings', 'Dry, burning season begins (haze)', 'Hot + smoky (worst air)', 'Hottest (Songkran)', 'Hot, first rains clear the air', 'Green season rains', 'Rainy season', 'Rainy season', 'Peak rains', 'Rains easing, lush', 'Cool, clear — Loy Krathong', 'Cool season, peak comfort'],
    best_months: ['November', 'December', 'January'],
    best_reason: 'cool clear air and festival season; avoid Feb–Apr when crop-burning haze blankets the north',
    top: [
      { name: 'Doi Suthep temple', why: 'the golden mountain shrine above the city' },
      { name: 'Old City temple loop', why: 'Wat Chedi Luang and 30 more inside the moat, by bicycle' },
      { name: 'Sunday Walking Street', why: 'the night market that swallows the whole old town' },
      { name: 'Ethical elephant sanctuary day', why: 'feed and walk with rescued elephants — no riding' },
    ],
    gems: [
      { name: 'Doi Suthep’s Wat Pha Lat', why: 'jungle monastery on the monk’s trail — most skip it' },
      { name: 'Baan Kang Wat artist village', why: 'ceramics, slow coffee, morning market' },
      { name: 'Chiang Dao caves & town (day trip)', why: 'limestone mountain village at the Myanmar frontier' },
    ],
    adventures: [
      { name: 'Monk’s Trail to Doi Suthep', why: 'hike the pilgrim path instead of driving up' },
      { name: 'Doi Inthanon National Park', why: 'Thailand’s highest peak, twin pagodas, waterfalls' },
      { name: 'Mae Wang bamboo rafting', why: 'drift a jungle river on a bamboo raft' },
    ],
    festivals: {
      2: [{ name: 'Flower Festival', timing: '1st weekend of Feb', note: 'flower-float parades before the haze arrives' }],
      4: [{ name: 'Songkran', timing: 'Apr 13–15', note: 'the moat becomes a citywide water-fight arena' }],
      11: [{ name: 'Yi Peng & Loy Krathong', timing: 'full moon of Nov', note: 'thousands of sky lanterns rising at once — the iconic photo' }],
    },
  },
  'Phuket': {
    crowd: 'pppsoooooosp',
    seasons: ['High season — dry, calm seas', 'Dry, hot', 'Hot, seas calm', 'Hottest (Songkran)', 'Rains begin, swells build', 'Green season — west swells', 'Rainy, red-flag surf days', 'Rainy season', 'Peak rains', 'Rains easing', 'Drying out, seas calming', 'High season begins'],
    best_months: ['December', 'January', 'February', 'March'],
    best_reason: 'flat turquoise seas and dry skies for island-hopping; May–Oct brings monsoon swells and red flags',
    top: [
      { name: 'Phang Nga Bay by longtail', why: 'James Bond karsts and sea caves' },
      { name: 'Phi Phi & Maya Bay (day trip)', why: 'the postcard — go on the earliest boat' },
      { name: 'Old Phuket Town', why: 'Sino-Portuguese shophouses, weekend night market' },
      { name: 'Big Buddha viewpoint', why: '45 m of white marble above the whole island' },
      { name: 'Kata Noi & Freedom Beach', why: 'the island’s cleanest swimming sand' },
    ],
    gems: [
      { name: 'Koh Yao Noi (day trip)', why: 'the quiet island between Phuket and Krabi time forgot' },
      { name: 'Banana Beach', why: 'jungle-path cove the resorts haven’t claimed' },
      { name: 'Phuket Town Sunday market (Lard Yai)', why: 'local food, old-town facades, no beach crowds' },
    ],
    adventures: [
      { name: 'Similan Islands liveaboard (Oct–May)', why: 'Thailand’s best diving, manta season' },
      { name: 'Sea kayak the Phang Nga hongs', why: 'paddle into hidden lagoons inside the karsts' },
      { name: 'Black Rock viewpoint hike', why: 'the wild southern cape on foot' },
    ],
    festivals: {
      4: [{ name: 'Songkran', timing: 'Apr 13–15', note: 'Patong’s water war is legendary chaos' }],
      10: [{ name: 'Vegetarian Festival', timing: '9 days, lunar (late Sep–Oct)', note: 'firewalking and intense street processions in Phuket Town' }],
      11: [{ name: 'Loy Krathong', timing: 'full moon of Nov', note: 'candle floats launched from every beach' }],
    },
  },
  'Seoul': {
    crowd: 'oosppsosppso',
    seasons: ['Freezing dry winter', 'Cold, late winter', 'Mild — cherry blossoms early Apr', 'Spring bloom, warm', 'Warm, pleasant', 'Warming, rains begin late', 'Monsoon (jangma) + heat', 'Hot humid, monsoon tail', 'Warm, clearing — Chuseok', 'Crisp autumn, foliage begins', 'Autumn leaves peak, cold snap late', 'Freezing dry winter'],
    best_months: ['April', 'May', 'September', 'October'],
    best_reason: 'cherry blossoms in April or crystal autumn skies in October — between the monsoon and the Siberian cold',
    top: [
      { name: 'Gyeongbokgung Palace', why: 'guard-changing ceremony; rent a hanbok for free entry' },
      { name: 'Bukchon Hanok Village', why: '600-year-old lanes between the palaces — go early' },
      { name: 'Myeongdong & Namsan Tower', why: 'street-food gauntlet then cable car to the city panorama' },
      { name: 'Gwangjang Market', why: 'bindaetteok and knife-cut noodles under one roof since 1905' },
      { name: 'Hongdae at night', why: 'buskers, K-fashion and the youth city at full volume' },
    ],
    gems: [
      { name: 'Seochon village', why: 'the quieter, artsier twin of Bukchon' },
      { name: 'Cheonggyecheon at dusk', why: 'the sunken stream that reset the city’s heart' },
      { name: 'Ihwa mural village & Naksan wall', why: 'fortress-wall sunset walk over the rooftops' },
      { name: 'Mangwon market + Han River picnic', why: 'buy snacks, rent a mat, live like a Seoulite' },
    ],
    adventures: [
      { name: 'Bukhansan National Park', why: 'granite peaks inside city limits — Korea’s most-climbed mountain' },
      { name: 'Seoul City Wall (Hanyangdoseong)', why: '18 km fortress loop over four peaks' },
      { name: 'Han River cycling to Paldang', why: 'riverside bike highways out of the city' },
    ],
    festivals: {
      4: [{ name: 'Cherry blossoms', timing: 'early–mid Apr', note: 'Yeouido’s 1,800 trees; Seokchon Lake at night' }],
      5: [{ name: 'Lotus Lantern Festival', timing: 'weekend before Buddha’s birthday (lunar, ~May)', note: 'a river of lanterns parades through downtown' }],
      10: [{ name: 'Seoul Fireworks Festival', timing: 'one Sat in Oct', note: 'a million people on the Han River banks' }],
    },
  },
  'Busan': {
    crowd: 'oossssoppsso',
    seasons: ['Cold dry winter (mildest in Korea)', 'Cold, clearing', 'Mild spring, blossoms late Mar', 'Spring bloom', 'Warm, sea fog possible', 'Warm, rains begin', 'Monsoon + heat', 'Peak beach season, hot', 'Warm, typhoon risk — film festival', 'Crisp autumn', 'Autumn leaves, cooling', 'Cold dry winter'],
    best_months: ['May', 'September', 'October', 'April'],
    best_reason: 'Korea’s mildest big city — beach weather without Seoul’s extremes; October adds the film festival and clear seas',
    top: [
      { name: 'Haeundae Beach & Blueline sky capsule', why: 'the famous sand plus a coastal capsule train' },
      { name: 'Gamcheon Culture Village', why: 'the rainbow hillside maze of art alleys' },
      { name: 'Jagalchi Fish Market', why: 'pick it swimming downstairs, eat it grilled upstairs' },
      { name: 'Haedong Yonggungsa', why: 'a temple on ocean rocks — sunrise is unreal' },
      { name: 'Gwangalli Beach at night', why: 'the diamond bridge lit across the bay, drone shows Sat' },
    ],
    gems: [
      { name: 'Huinnyeoul culture village', why: 'cliffside white lanes over the shipping straits' },
      { name: 'Songdo skywalk & cable car', why: 'the original 1913 beach, reinvented' },
      { name: 'Millak waterside raw-fish town', why: 'hoe (sashimi) on the rocks with locals' },
    ],
    adventures: [
      { name: 'Igidae coastal walk', why: 'cliff boardwalks facing the Haeundae skyline' },
      { name: 'Geumjeong fortress ridge', why: 'cable car up, 17 km of wall walking, makgeolli village down' },
      { name: 'Taejongdae cliffs', why: 'volcanic headland loops above lighthouse rocks' },
    ],
    festivals: {
      8: [{ name: 'Busan Sea Festival', timing: 'early Aug', note: 'beach concerts and water fights across five beaches' }],
      10: [{ name: 'Busan International Film Festival', timing: 'early Oct', note: 'Asia’s biggest — stars, premieres, open-air screenings' }, { name: 'Busan Fireworks Festival', timing: 'late Oct–Nov', note: 'Gwangalli bridge becomes the launchpad' }],
    },
  },
  'Jeju': {
    crowd: 'oosssspposso',
    seasons: ['Cold windy winter — camellias', 'Cold, plum blossoms', 'Mild — canola fields bloom yellow', 'Spring bloom, cherry + canola', 'Green season, mild', 'Warm, rains begin', 'Monsoon, humid', 'Peak beach season, hot, typhoon risk', 'Warm, typhoon risk', 'Crisp, silvergrass season', 'Autumn tangerine harvest', 'Cold windy winter'],
    best_months: ['April', 'May', 'October', 'June'],
    best_reason: 'canola-yellow spring or silvergrass autumn; summer brings crowds and typhoons, winter brings wind',
    top: [
      { name: 'Hallasan National Park', why: 'South Korea’s highest peak — a crater-lake volcano' },
      { name: 'Seongsan Ilchulbong (Sunrise Peak)', why: 'climb the tuff cone at dawn, watch haenyeo divers after' },
      { name: 'Manjanggul lava tube', why: 'walk a kilometre inside a UNESCO lava tunnel' },
      { name: 'Woljeongri & Hyeopjae beaches', why: 'Caribbean-blue water on volcanic sand' },
      { name: 'Haenyeo women divers show, Seongsan', why: 'the island’s legendary free-divers, living heritage' },
    ],
    gems: [
      { name: 'Olle Trail route 7', why: 'the best of the 437 km coastal walking network' },
      { name: 'Camellia Hill in winter', why: 'red blooms when the rest of Korea is grey' },
      { name: 'Udo island by bike', why: 'a mini-Jeju offshore with peanut ice cream' },
    ],
    adventures: [
      { name: 'Hallasan summit (Gwaneumsa trail)', why: '1,947 m crater rim — start before dawn, permits via app' },
      { name: 'Olle Trail multi-day sections', why: 'village-to-village coastal walking with stamps' },
      { name: 'Geomun Oreum volcanic cone', why: 'UNESCO lava-forest hike, reservation only' },
    ],
    festivals: {
      3: [{ name: 'Canola Flower Festival', timing: 'Mar–Apr', note: 'yellow fields against blue sea around Seongsan' }],
      5: [{ name: 'Jeju Fire Festival aftermath season', timing: 'early Mar (lunar)', note: 'an entire hill set alight for good harvest — reschedules with weather' }],
      10: [{ name: 'Silvergrass season, Saebyeol Oreum', timing: 'Oct–Nov', note: 'hills of silver plumes at golden hour' }],
    },
  },
  'Beijing': {
    crowd: 'oospppppppso',
    seasons: ['Cold dry winter', 'Cold winter (CNY)', 'Windy spring, dust storms possible', 'Mild spring — blossoms', 'Warm, pleasant spring', 'Hot, humid rains begin', 'Hot rainy summer', 'Hot humid summer', 'Warm, clear autumn (the best)', 'Crisp autumn — National Day crowds', 'Cool autumn', 'Cold dry winter'],
    best_months: ['September', 'October', 'April', 'May'],
    best_reason: 'clear, mild spring and autumn skies — between early spring dust, the humid summer rains and the freezing winter',
    top: [
      { name: 'Great Wall at Mutianyu', why: 'restored ramparts with cable car and toboggan, far less mobbed than Badaling' },
      { name: 'Forbidden City', why: '600 years of imperial palace — book timed tickets days ahead' },
      { name: 'Temple of Heaven', why: 'perfect Ming geometry and dawn tai-chi in the park' },
      { name: 'Summer Palace', why: 'lakeside imperial gardens and the Long Corridor' },
      { name: 'Tiananmen Square & the hutongs', why: 'the monumental center, then get lost in the old lanes' },
    ],
    gems: [
      { name: 'Jingshan Park at sunset', why: 'the postcard view down onto the Forbidden City’s golden roofs' },
      { name: '798 Art District', why: 'Bauhaus arms factory turned China’s edgiest gallery quarter' },
      { name: 'Gubei Water Town', why: 'lantern-lit canal town beneath the wild Simatai wall, night-lit' },
      { name: 'Wudaoying & Fangjia hutongs', why: 'craft coffee, indie shops and courtyard bars locals love' },
    ],
    adventures: [
      { name: 'Jiankou to Mutianyu wild-wall hike', why: 'the crumbling, dramatic Great Wall on foot (guide recommended)' },
      { name: 'Fragrant Hills in autumn', why: 'smoke-tree crimson across the western hills, mid-Oct to Nov' },
      { name: 'Longqing Gorge', why: 'boat-ride canyon north of the city, ice festival in winter' },
    ],
    festivals: {
      1: [{ name: 'Chinese New Year (Spring Festival)', timing: 'late Jan–mid Feb, lunar', note: 'temple fairs at Ditan & Longtan; many shops shut, transport is packed' }],
      2: [{ name: 'Lantern Festival', timing: '15th day of lunar new year', note: 'lanterns and yuanxiao close out the New Year season' }],
      10: [{ name: 'National Day Golden Week', timing: 'Oct 1–7', note: 'the whole country travels at once — book far ahead or avoid' }],
    },
  },
  'Shanghai': {
    crowd: 'oosppssspppo',
    seasons: ['Cold damp winter', 'Cold winter (CNY)', 'Mild spring', 'Warm spring (the best)', 'Warm, pleasant', 'Plum rains (meiyu), humid', 'Hot humid summer, typhoon risk', 'Hot humid, typhoon risk', 'Warm, clearing autumn', 'Crisp autumn — Golden Week', 'Cool autumn (excellent)', 'Cold damp winter'],
    best_months: ['October', 'November', 'April', 'May'],
    best_reason: 'dry, mild spring and autumn — skipping the June plum rains, the muggy typhoon summer and the raw winter damp',
    top: [
      { name: 'The Bund at dusk', why: 'colonial waterfront facing the Pudong skyline lighting up' },
      { name: 'Yu Garden & Old City', why: 'Ming-dynasty rockeries, teahouse and bazaar lanes' },
      { name: 'Shanghai Tower & Lujiazui', why: 'the world’s 2nd-tallest, glass-floor observation deck' },
      { name: 'French Concession', why: 'plane-tree avenues, Art Deco villas and café culture' },
      { name: 'Nanjing Road & People’s Square', why: 'the neon shopping spine and top museums' },
    ],
    gems: [
      { name: 'Tianzifang', why: 'shikumen alley warren of studios and tiny bars' },
      { name: 'Zhujiajiao water town', why: 'Ming canals and stone bridges, an hour out' },
      { name: 'M50 Moganshan art district', why: 'riverside warehouses of contemporary galleries' },
      { name: 'Columbia Circle (Panyu Rd)', why: 'restored 1930s club compound turned lifestyle campus' },
    ],
    adventures: [
      { name: 'She Shan hills & basilica', why: 'the city’s only real hill, observatory and cathedral' },
      { name: 'Chongming Island wetlands', why: 'birdwatching and cycling on the Yangtze estuary isle' },
      { name: 'Hangzhou West Lake (day trip)', why: 'China’s most famous lake, 45 min by bullet train' },
    ],
    festivals: {
      1: [{ name: 'Chinese New Year', timing: 'late Jan–mid Feb, lunar', note: 'Yu Garden lantern displays; Longhua Temple bell-ringing' }],
      10: [{ name: 'National Day Golden Week', timing: 'Oct 1–7', note: 'sights and trains jammed nationwide — plan around it' }],
      11: [{ name: 'Shanghai food & jazz season', timing: 'autumn', note: 'hairy-crab season peaks — the local autumn delicacy' }],
    },
  },
  'Xi\'an': {
    crowd: 'oospppppppso',
    seasons: ['Cold dry winter', 'Cold winter (CNY)', 'Mild spring, occasional dust', 'Warm spring (excellent)', 'Warm, pleasant', 'Hot, dry-to-humid', 'Hot rainy summer', 'Hot humid summer', 'Warm clear autumn (the best)', 'Crisp autumn — Golden Week', 'Cool autumn', 'Cold dry winter'],
    best_months: ['September', 'October', 'April', 'May'],
    best_reason: 'comfortable, dry spring and autumn for walking the walls and the warriors — summers are baking, winters bitter',
    top: [
      { name: 'Terracotta Army', why: 'the 8,000-strong clay legion — one of the great sights on earth' },
      { name: 'Xi’an City Wall', why: 'cycle the complete 14 km Ming rampart at rooftop height' },
      { name: 'Muslim Quarter & Great Mosque', why: 'sizzling street food lanes and a serene Sino-Islamic mosque' },
      { name: 'Big Wild Goose Pagoda', why: 'Tang-era pagoda with the country’s biggest fountain show' },
      { name: 'Bell & Drum Towers', why: 'the lit-up heart of the old walled city at night' },
    ],
    gems: [
      { name: 'Hanyangling (Han Yang Mausoleum)', why: 'glass-floor underground tomb museum most tour buses skip' },
      { name: 'Great Tang All Day Mall', why: 'Tang-themed night boulevard of performers and light' },
      { name: 'Shuyuanmen calligraphy street', why: 'ink, brushes and seals under the South Gate' },
    ],
    adventures: [
      { name: 'Mount Huashan (day trip)', why: 'China’s vertigo-inducing sacred peak — plank walks and cable cars' },
      { name: 'Mount Li & Huaqing hot springs', why: 'imperial spa hillside beside the Terracotta site' },
      { name: 'Qinling foothills cycling', why: 'temple-dotted country roads south of the city' },
    ],
    festivals: {
      1: [{ name: 'Chinese New Year', timing: 'late Jan–mid Feb, lunar', note: 'City Wall lantern festival is one of China’s finest' }],
      10: [{ name: 'National Day Golden Week', timing: 'Oct 1–7', note: 'the Terracotta site hits capacity — go at opening or avoid' }],
    },
  },
  'Chengdu': {
    crowd: 'osspssssppso',
    seasons: ['Cold, grey, damp', 'Cool winter (CNY)', 'Mild spring', 'Warm spring (the best)', 'Warm, humid', 'Hot humid', 'Hot muggy summer', 'Hot muggy summer', 'Warm, pleasant autumn (excellent)', 'Mild autumn — Golden Week', 'Cool, misty', 'Cold, grey, damp'],
    best_months: ['March', 'April', 'September', 'October'],
    best_reason: 'mild, dry-ish spring and autumn in a famously cloudy, humid basin — summers are muggy, winters grey and cold',
    top: [
      { name: 'Chengdu Research Base of Giant Panda Breeding', why: 'dozens of pandas — arrive at opening for the active morning feed' },
      { name: 'Jinli & Kuanzhai Alleys', why: 'restored Qing lanes of snacks, teahouses and shadow puppets' },
      { name: 'People’s Park teahouse', why: 'bottomless tea, ear-cleaners and mahjong — the soul of Chengdu' },
      { name: 'Wuhou Shrine & Wenshu Monastery', why: 'Three Kingdoms history and the city’s finest Buddhist temple' },
      { name: 'Sichuan hotpot night', why: 'the numbing-spicy málà ritual the city is built around' },
    ],
    gems: [
      { name: 'Sichuan Opera face-changing', why: 'the bian lian mask-swap show, best in a small teahouse theatre' },
      { name: 'Anren old town & museums', why: 'mansion town with a vast private museum cluster, day trip' },
      { name: 'Pingle ancient town', why: 'riverside banyan town far quieter than Jinli' },
    ],
    adventures: [
      { name: 'Mount Qingcheng', why: 'birthplace of Taoism — misty temple trails, cable car option' },
      { name: 'Leshan Giant Buddha (day trip)', why: 'the 71 m cliff Buddha, by boat or the riverside steps' },
      { name: 'Mount Emei (overnight)', why: 'sacred summit sea-of-clouds sunrise and cheeky monkeys' },
    ],
    festivals: {
      1: [{ name: 'Chinese New Year', timing: 'late Jan–mid Feb, lunar', note: 'temple fairs and lantern shows at Wuhou and Huanglongxi' }],
      10: [{ name: 'National Day Golden Week', timing: 'Oct 1–7', note: 'panda base and hotpot spots overflow — book ahead' }],
    },
  },
  'Guilin': {
    crowd: 'oosppppppsoo',
    seasons: ['Cool, misty, damp', 'Cool winter (CNY)', 'Mild spring, showery', 'Warm, green, wetter', 'Warm — river high, lush', 'Rainy season, humid', 'Hot humid summer', 'Hot humid summer', 'Warm, clearing (excellent)', 'Mild, dry autumn (the best)', 'Cool autumn', 'Cool, misty'],
    best_months: ['October', 'April', 'May', 'September'],
    best_reason: 'the karst rivers are greenest and skies clearest in spring and autumn — summer is hot and wet, winter cold and hazy',
    top: [
      { name: 'Li River cruise to Yangshuo', why: 'the karst-peak river journey printed on the ¥20 note' },
      { name: 'Yangshuo & West Street', why: 'backpacker karst-country base for cycling and climbing' },
      { name: 'Longji Rice Terraces', why: 'the “Dragon’s Backbone” terraces — greenest May–Jun, gold Sep–Oct' },
      { name: 'Reed Flute Cave', why: 'floodlit limestone cavern of surreal color' },
      { name: 'Xianggong Hill / Xingping', why: 'the classic sunrise viewpoint over the river bend' },
    ],
    gems: [
      { name: 'Yulong River bamboo raft', why: 'the quieter tributary, paddies and arched stone bridges' },
      { name: 'Xingping old town', why: 'the prettiest river village, minus the Yangshuo crowds' },
      { name: 'Impression Sanjie Liu show', why: 'Zhang Yimou’s river-stage light spectacle at dusk' },
    ],
    adventures: [
      { name: 'Yangshuo rock climbing', why: 'Asia’s premier karst sport-climbing, routes for all levels' },
      { name: 'Cycle the Ten-Mile Gallery', why: 'flat karst-country lanes past farms and river bends' },
      { name: 'Longji terraces village trek', why: 'walk Ping’an to Dazhai between Zhuang and Yao hamlets' },
    ],
    festivals: {
      1: [{ name: 'Chinese New Year', timing: 'late Jan–mid Feb, lunar', note: 'river towns quiet down; misty low season' }],
      4: [{ name: 'Zhuang “San Yue San” song festival', timing: '3rd day of 3rd lunar month (~Apr)', note: 'ethnic-minority singing and color across the region' }],
      10: [{ name: 'National Day Golden Week', timing: 'Oct 1–7', note: 'terraces at peak gold but very busy' }],
    },
  },
};
