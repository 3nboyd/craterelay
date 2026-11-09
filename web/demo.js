const titles = [
  "First Light", "Blue Hour", "Side Room", "Palms at Night", "Afterimage", "Glass Elevator",
  "Paper Lanterns", "Room Service", "Low Orbit", "Loose Signal", "Neon Current", "Last Call",
  "Soft Focus", "Second Floor", "Half Step", "Out of Phase", "Borrowed Time", "Slipstream",
  "Mirror Ball", "Quiet Hours", "Deep End", "Pass It On", "City Limits", "Glow Tape",
  "Soft Reset", "Parallel Lines", "Back Pocket", "Off the Record", "Taxi Home", "Slow Flash",
  "South Exit", "Stay Awhile", "Air Gap", "Orange Street", "House Lights", "Late Checkout",
  "Side Room (Late Edit)", "Warm Signal", "No Reception", "After the Rain"
];
const artists = ["North Window", "Signal Garden", "Civic Twin", "Blue Switch", "Palm Reader", "Soft Circuit"];
const tempo = [117, 118, 120, 122, 121, 124, 125, 124, 127, 129, 131, 132];
const keys = ["8A", "8A", "9A", "9B", "9B", "10B", "10A", "10A", "11A", "11B", "12B", "12A"];

export const tracks = titles.map((title, index) => ({
  id: index,
  title,
  artist: artists[index === 2 || index === 36 ? 1 : index % artists.length],
  bpm: index === 39 ? null : tempo[index % tempo.length],
  key: index === 38 ? null : keys[index % keys.length],
  genre: index === 39 ? null : ["House", "Disco", "Garage"][index % 3],
  energy: index % 5 === 4 ? null : 3 + Math.floor((index % 12) / 2),
  path: index === 39 ? null : "demo/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "") + ".mp3"
}));

export const drafts = [
  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39],
  [12,25,14,27,16,29,18,31,20,33,22,35,0,13,2,15,4,17,6,19,8,21,10,23,24,1,26,3,28,5,30,7,32,9,34,11,36,37,38,39]
];
