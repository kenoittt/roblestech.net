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
  top: { name: string; why: string }[];
  gems: { name: string; why: string }[];
  festivals: Record<number, { name: string; timing: string; note: string }[]>;
};

export const PACKS: Record<string, Pack> = {
  'Hanoi': {
    crowd: 'psooossssppp',
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
    festivals: {
      1: [{ name: 'Tet (Lunar New Year)', timing: 'late Jan–mid Feb, lunar', note: 'the city empties and glows — magical but many shops close for a week' }],
      2: [{ name: 'Perfume Pagoda Festival', timing: 'from mid Feb, lunar', note: 'huge riverboat pilgrimage south of the city' }],
      9: [{ name: 'Mid-Autumn Festival', timing: 'full moon, Sep–early Oct', note: 'lantern-lit streets and mooncakes, best around Hang Ma street' }],
      10: [{ name: 'Hanoi Liberation Day', timing: 'Oct 10', note: 'flags, concerts and fireworks around Hoan Kiem' }],
    },
  },
  'Ho Chi Minh City': {
    crowd: 'ppsooooosssp',
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
    festivals: {
      1: [{ name: 'Tet (Lunar New Year)', timing: 'late Jan–mid Feb, lunar', note: 'Nguyen Hue flower street is spectacular; book rooms far ahead' }],
      4: [{ name: 'Reunification Day', timing: 'Apr 30', note: 'parades and fireworks over the Saigon River' }],
      9: [{ name: 'Mid-Autumn Festival', timing: 'full moon, Sep–early Oct', note: 'lantern lanes in Cholon’s Luong Nhu Hoc street' }],
    },
  },
  'Da Nang': {
    crowd: 'ossppppssoos',
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
    festivals: {
      6: [{ name: 'Da Nang International Fireworks Festival', timing: 'weekends Jun–Jul', note: 'world-class pyrotechnics over the Han River' }],
      9: [{ name: 'Mid-Autumn Festival', timing: 'full moon, Sep–early Oct', note: 'lion dances along Bach Dang riverfront' }],
    },
  },
  'Hoi An': {
    crowd: 'osspppssooos',
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
    festivals: {
      1: [{ name: 'Full Moon Lantern Festival', timing: '14th of each lunar month', note: 'electric lights off, candle lanterns on the Thu Bon river — every month, check lunar dates' }],
      2: [{ name: 'Tet in the Ancient Town', timing: 'late Jan–mid Feb, lunar', note: 'flower markets and calligraphy streets' }],
      9: [{ name: 'Mid-Autumn Festival', timing: 'full moon, Sep–early Oct', note: 'the lantern town at its most photogenic' }],
    },
  },
  'Ha Long': {
    crowd: 'ssoosppposss',
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
    festivals: {
      4: [{ name: 'Ha Long Carnival', timing: 'late Apr–early May', note: 'parades and beach concerts opening summer season' }],
    },
  },
  'Sapa': {
    crowd: 'oossspsspsoo',
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
    festivals: {
      9: [{ name: 'Harvest season', timing: 'mid Sep–early Oct', note: 'not a festival but the event — terraces turn gold for ~3 weeks' }],
    },
  },
  'Taipei': {
    crowd: 'pssssoosspps',
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
    festivals: {
      3: [{ name: 'Dajia Mazu Pilgrimage', timing: 'lunar Mar, ~Apr', note: 'nine days, 300 km, a million pilgrims — Taiwan’s biggest religious event departs from nearby Dajia' }],
    },
  },
  'Kaohsiung': {
    crowd: 'psssoooosssp',
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
    festivals: {
      2: [{ name: 'Kaohsiung Lantern Festival', timing: 'around lunar new year’s 15th day', note: 'light art along the Love River' }],
    },
  },
  'Tainan': {
    crowd: 'psssoooossss',
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
    festivals: {
      2: [{ name: 'Yanshui Beehive Fireworks', timing: 'lunar new year’s 14th–15th day', note: 'rockets fired INTO the crowd — Taiwan’s wildest festival; full protective gear required' }],
    },
  },
  'Hualien': {
    crowd: 'osssspposoos',
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
    festivals: {
      7: [{ name: 'Amis Harvest Festival', timing: 'Jul–Aug, village-by-village', note: 'indigenous song-and-dance gatherings; ask locally which villages welcome visitors' }],
    },
  },
  'Hong Kong': {
    crowd: 'ppsssooosspp',
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
    festivals: {
      3: [{ name: 'Nauryz', timing: 'Mar 21–23', note: 'Kazakh new year — yurts, kokpar horse games and nauryz-kozhe in every park' }],
    },
  },
  'Astana': {
    crowd: 'ooosspppsoos',
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
    festivals: {
      7: [{ name: 'Astana Day', timing: 'Jul 6', note: 'concerts and fireworks across the Left Bank' }],
      3: [{ name: 'Nauryz', timing: 'Mar 21–23', note: 'spring new year celebrated even in the snow' }],
    },
  },
  'Shymkent': {
    crowd: 'oossppssssoo',
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
    festivals: {
      3: [{ name: 'Nauryz', timing: 'Mar 21–23', note: 'the south celebrates hardest — horse games and street plov' }],
    },
  },
  'Tashkent': {
    crowd: 'oosspposssoo',
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
    festivals: {
      3: [{ name: 'Navruz', timing: 'Mar 21', note: 'sumalak stirred all night in courtyards across the city' }],
      9: [{ name: 'Independence Day', timing: 'Sep 1', note: 'concerts and lights along the boulevards' }],
    },
  },
  'Samarkand': {
    crowd: 'oosppossppoo',
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
    festivals: {
      3: [{ name: 'Navruz', timing: 'Mar 21', note: 'games and plov in front of the Registan' }],
      8: [{ name: 'Sharq Taronalari music festival', timing: 'late Aug, biennial (odd years)', note: 'world musicians performing ON the Registan' }],
    },
  },
  'Bukhara': {
    crowd: 'oosppossppoo',
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
    festivals: {
      3: [{ name: 'Navruz', timing: 'Mar 21', note: 'street feasts under the trading domes' }],
      5: [{ name: 'Silk and Spices Festival', timing: 'late May–early Jun', note: 'artisans and dancers fill the old town' }],
    },
  },
  'Khiva': {
    crowd: 'oospposssooo',
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
    festivals: {
      3: [{ name: 'Navruz', timing: 'Mar 21', note: 'tightrope walkers and wrestling inside the walls' }],
      8: [{ name: 'Melon festival', timing: 'Aug', note: 'Khorezm’s legendary melons get their own party' }],
    },
  },
  'Bishkek': {
    crowd: 'oossspppssoo',
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
    festivals: {
      3: [{ name: 'Nooruz', timing: 'Mar 21', note: 'horse games in the hippodrome, sumolok in the squares' }],
      8: [{ name: 'Independence Day', timing: 'Aug 31', note: 'concerts on Ala-Too Square' }],
    },
  },
  'Karakol': {
    crowd: 'osooospppsoo',
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
    festivals: {
      7: [{ name: 'Yurt & eagle-hunting demos', timing: 'Jul–Aug, various', note: 'community tourism days around Issyk-Kul’s south shore' }],
    },
  },
  'Osh': {
    crowd: 'oosspppsssoo',
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
    festivals: {
      3: [{ name: 'Nooruz', timing: 'Mar 21', note: 'the valley’s biggest sumolok cauldrons' }],
    },
  },
  'Issyk-Kul (Cholpon-Ata)': {
    crowd: 'oooossppsooo',
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
    festivals: {
      9: [{ name: 'World Nomad Games heritage', timing: 'Sep, biennial (host rotates)', note: 'born here — kok-boru and eagle contests when hosted; smaller ethno-festivals most summers' }],
    },
  },
};
