// Master card list — bundled into the client since there is no server.
// Note: any player can technically inspect this in devtools; true hidden
// information is not achievable without a trusted server. This keeps the
// deck out of the *rendered UI* only — each player still just sees their
// own dealt hand and the shared board.
export const MASTER_DECK = [
  "The Ace of Shadows", "A Whisper in the Dark", "Sudden Betrayal",
  "Fortune's Favor", "The Last Stand", "Echoes of the Past",
  "A Twist of Fate", "The Silent Guardian", "Reckless Gambit",
  "The Hidden Path", "A Moment of Clarity", "The Broken Oath",
  "Storm on the Horizon", "The Wanderer's Map", "A Debt Repaid",
  "The Iron Resolve", "Fleeting Glory", "The Forgotten Key",
  "A Spark of Hope", "The Long Con", "Shattered Alliance",
  "The Final Gambit", "A Stroke of Luck", "The Quiet Storm",
  "Rising Tide", "The Cunning Trap", "A Second Chance",
  "The Bold Advance", "Whispers of Doubt", "The Golden Opportunity",
  "A Calculated Risk", "The Steady Hand", "Turning Point",
  "The Desperate Measure", "A New Alliance", "The Sharpened Blade",
  "Fading Light", "The Unexpected Ally", "A Costly Mistake",
  "The Grand Deception", "Rally the Troops", "The Empty Promise",
  "A Sudden Reversal", "The Waiting Game", "Bold Ambition",
  "The Last Resort", "A Fragile Truce", "The Master Plan",
  "Unforeseen Consequence", "The Final Hour", "A Glimmer of Truth",
  "The Reluctant Hero", "Chaos Unleashed", "The Patient Predator"
];

export const HAND_SIZE = 5;
