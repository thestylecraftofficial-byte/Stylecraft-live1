export const validIntake = () => ({
  contact: { name: "Test Person", phone: "9876543210", email: "t@example.com" },
  profile: {
    ageRange: "25-30", presentation: "menswear", cityZone: "hyderabad-it-corridor",
    occasions: ["office", "date"], stylePrefs: ["smart-casual"], likedColours: ["navy"], dislikedColours: ["yellow"],
    fitPreference: "regular", budgetBand: "1500-3000", categories: ["western-men"],
    measurements: {
      height: { value: 172, unsure: false }, shoulder: { value: 44, unsure: false },
      chest_or_bust: { value: 98, unsure: false }, waist: { value: null, unsure: true },
      hips: { value: 96, unsure: false }, inseam: { value: 78, unsure: false },
    },
    undertone: { veins: "green", sun: "tans-easily", jewellery: "gold", hair: "black", eyes: "dark-brown" },
  },
  consent: { accepted: ["adult", "collect", "photo", "ai", "delete"], keepAnonymous: true },
});
