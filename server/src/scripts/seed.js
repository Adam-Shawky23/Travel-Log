require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Trip = require('../models/Trip');

const DEMO_PASSWORD = 'password123';

const DEMO_USERS = [
  {
    email: 'demo@travel-log.app',
    name: 'Demo Traveler',
    trips: [
      {
        title: 'Lisbon in April',
        description:
          "Yellow trams, pastel de nata every morning, and a view of the Tagus from almost every hill. Didn't want to leave.",
        startDate: new Date('2025-04-10'),
        endDate: new Date('2025-04-17'),
        location: { name: 'Lisbon, Portugal', lat: 38.7223, lng: -9.1393 },
        isPublic: true,
      },
      {
        title: 'Reykjavik road trip',
        description:
          'Rented a car and chased the Ring Road counterclockwise. Saw the northern lights on night three, almost gave up by then.',
        startDate: new Date('2024-10-02'),
        endDate: new Date('2024-10-12'),
        location: { name: 'Reykjavik, Iceland', lat: 64.1466, lng: -21.9426 },
        isPublic: false,
      },
    ],
  },
  {
    email: 'mara@travel-log.app',
    name: 'Mara Lindqvist',
    trips: [
      {
        title: 'Kyoto, cherry blossoms',
        description:
          "Timed it just right for sakura season. Philosopher's Path at dawn before the crowds arrived was the highlight.",
        startDate: new Date('2025-03-28'),
        endDate: new Date('2025-04-04'),
        location: { name: 'Kyoto, Japan', lat: 35.0116, lng: 135.7681 },
        isPublic: true,
      },
      {
        title: 'Cape Town & the Winelands',
        description:
          'Table Mountain on a cloudless day, then three days around Stellenbosch doing absolutely nothing productive.',
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-01-30'),
        location: { name: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241 },
        isPublic: true,
      },
    ],
  },
  {
    email: 'theo@travel-log.app',
    name: 'Theo Alvarez',
    trips: [
      {
        title: 'A week in Oaxaca',
        description:
          'Mezcal tastings, mole negro, and a day trip out to Hierve el Agua. Still thinking about the market breakfasts.',
        startDate: new Date('2024-11-15'),
        endDate: new Date('2024-11-22'),
        location: { name: 'Oaxaca, Mexico', lat: 17.0732, lng: -96.7266 },
        isPublic: true,
      },
      {
        title: 'Weekend in Ljubljana',
        description:
          'Small enough to walk end to end twice. The castle hill view at sunset made the whole trip worth it.',
        startDate: new Date('2023-09-08'),
        endDate: new Date('2023-09-11'),
        location: { name: 'Ljubljana, Slovenia', lat: 46.0569, lng: 14.5058 },
        isPublic: false,
      },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  let tripCount = 0;

  for (const demoUser of DEMO_USERS) {
    const existing = await User.findOne({ email: demoUser.email });
    if (existing) {
      await Trip.deleteMany({ owner: existing._id });
      await existing.deleteOne();
    }

    const user = await User.create({
      name: demoUser.name,
      email: demoUser.email,
      passwordHash,
    });

    await Trip.insertMany(demoUser.trips.map((trip) => ({ ...trip, owner: user._id })));
    tripCount += demoUser.trips.length;
  }

  console.log(`Seeded ${DEMO_USERS.length} travelers with ${tripCount} trips total`);
  console.log(`Log in with: ${DEMO_USERS[0].email} / ${DEMO_PASSWORD}`);
  console.log(`(Other demo accounts share the same password: ${DEMO_USERS.slice(1).map((u) => u.email).join(', ')})`);

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
