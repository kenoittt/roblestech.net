/* Built-in checklist starter templates by occasion. Users clone one into
   their own presets, then tweak. Zero-cost, curated at build time. */
export type Starter = { key: string; name: string; icon: string; items: string[] };

export const STARTERS: Starter[] = [
  {
    key: 'essentials', name: 'Travel essentials', icon: 'check',
    items: ['Passport / ID', 'Visa or e-Visa printout', 'Boarding passes', 'Phone + charger', 'Power bank', 'Universal adapter', 'Debit/credit cards', 'Some local cash', 'Travel insurance details', 'Medications', 'Reusable water bottle', 'Copies of documents (photo + printed)'],
  },
  {
    key: 'beach', name: 'Beach & islands', icon: 'beach',
    items: ['Swimwear (x2)', 'Reef-safe sunscreen SPF 50', 'Sunglasses', 'Sun hat', 'Flip-flops / sandals', 'Quick-dry towel', 'Dry bag for phone', 'Aloe / after-sun', 'Snorkel mask (optional)', 'Light cover-up', 'Insect repellent'],
  },
  {
    key: 'city', name: 'City break', icon: 'city',
    items: ['Comfortable walking shoes', 'Day bag / crossbody', 'Layer for evenings', 'Portable charger', 'Offline maps downloaded', 'Museum/attraction tickets', 'Compact umbrella', 'One smart outfit for dinner'],
  },
  {
    key: 'business', name: 'Business trip', icon: 'card',
    items: ['Laptop + charger', 'Business cards', 'Notebook & pen', 'Formal outfit(s)', 'Dress shoes', 'Presentation / files backed up', 'Chargers & cables', 'Travel-size toiletries', 'Meeting address & itinerary'],
  },
  {
    key: 'winter', name: 'Cold / winter', icon: 'cloud',
    items: ['Insulated coat', 'Thermal base layers', 'Sweaters / fleece', 'Gloves', 'Beanie / warm hat', 'Scarf', 'Waterproof boots', 'Wool socks (x several)', 'Lip balm & moisturizer', 'Hand warmers'],
  },
  {
    key: 'hiking', name: 'Hiking & outdoors', icon: 'mountain',
    items: ['Hiking boots (broken in)', 'Moisture-wicking layers', 'Rain shell', 'Daypack', 'Water + filter/tablets', 'Trail snacks', 'First-aid kit', 'Headlamp', 'Sunscreen & cap', 'Blister plasters', 'Offline trail map / GPS'],
  },
  {
    key: 'family', name: 'Family with kids', icon: 'users',
    items: ['Kids’ documents / passports', 'Snacks & refillable bottles', 'Wet wipes & tissues', 'Change of clothes per child', 'Favorite toy / comfort item', 'Tablet + headphones, loaded', 'Kids’ medications', 'Stroller / carrier', 'Sun hats & sunscreen', 'Plasters & basic meds'],
  },
];
