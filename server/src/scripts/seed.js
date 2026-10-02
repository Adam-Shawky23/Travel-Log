require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Trip = require('../models/Trip');

const DEMO_PASSWORD = 'password123';
const SEED_PHOTOS_DIR = path.join(__dirname, 'seed-photos');
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

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
        photoFiles: ['lisbon-1.jpg', 'lisbon-2.jpg'],
      },
      {
        title: 'Reykjavik road trip',
        description:
          'Rented a car and chased the Ring Road counterclockwise. Saw the northern lights on night three, almost gave up by then.',
        startDate: new Date('2024-10-02'),
        endDate: new Date('2024-10-12'),
        location: { name: 'Reykjavik, Iceland', lat: 64.1466, lng: -21.9426 },
        isPublic: false,
        photoFiles: ['reykjavik-1.jpg', 'reykjavik-2.jpg'],
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
        photoFiles: ['kyoto-1.jpg', 'kyoto-2.jpg'],
      },
      {
        title: 'Cape Town & the Winelands',
        description:
          'Table Mountain on a cloudless day, then three days around Stellenbosch doing absolutely nothing productive.',
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-01-30'),
        location: { name: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241 },
        isPublic: true,
        photoFiles: ['capetown-1.jpg', 'capetown-2.jpg'],
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
        photoFiles: ['oaxaca-1.jpg', 'oaxaca-2.jpg'],
      },
      {
        title: 'Weekend in Ljubljana',
        description:
          'Small enough to walk end to end twice. The castle hill view at sunset made the whole trip worth it.',
        startDate: new Date('2023-09-08'),
        endDate: new Date('2023-09-11'),
        location: { name: 'Ljubljana, Slovenia', lat: 46.0569, lng: 14.5058 },
        isPublic: false,
        photoFiles: ['ljubljana-1.jpg', 'ljubljana-2.jpg'],
      },
    ],
  },
];

// Copies each trip's seed photos into this user's uploads dir (mirroring
// what multer's disk storage would produce) and returns the "/uploads/..."
// paths to store on the trip document.
function copyTripPhotos(userId, photoFiles) {
  if (!photoFiles || photoFiles.length === 0) return [];

  const destDir = path.join(UPLOADS_DIR, userId);
  fs.mkdirSync(destDir, { recursive: true });

  return photoFiles.map((filename) => {
    const ext = path.extname(filename);
    const destName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    fs.copyFileSync(path.join(SEED_PHOTOS_DIR, filename), path.join(destDir, destName));
    return `/uploads/${userId}/${destName}`;
  });
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  let tripCount = 0;

  for (const demoUser of DEMO_USERS) {
    const existing = await User.findOne({ email: demoUser.email });
    if (existing) {
      await Trip.deleteMany({ owner: existing._id });
      await existing.deleteOne();
      fs.rmSync(path.join(UPLOADS_DIR, existing._id.toString()), { recursive: true, force: true });
    }

    const user = await User.create({
      name: demoUser.name,
      email: demoUser.email,
      passwordHash,
    });
    const userId = user._id.toString();

    await Trip.insertMany(
      demoUser.trips.map(({ photoFiles, ...trip }) => ({
        ...trip,
        owner: user._id,
        photos: copyTripPhotos(userId, photoFiles),
      }))
    );
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
